-- OMNII MOBILE: Secure Server-Side Onboarding Validation
-- Prevents client-side level/XP tampering by enforcing server-side validation

-- 0. CRITICAL: Level calculation function (was missing!)
CREATE OR REPLACE FUNCTION calculate_level_from_xp(total_xp INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  level INTEGER := 1;
BEGIN
  -- Level requirements: Check from HIGHEST to LOWEST XP
  -- This prevents the bug where lower checks match first
  
  -- Advanced levels (6+)
  IF total_xp >= 60000 THEN level := 50;
  ELSIF total_xp >= 35000 THEN level := 40;
  ELSIF total_xp >= 18000 THEN level := 30;
  ELSIF total_xp >= 12000 THEN level := 25;
  ELSIF total_xp >= 8000 THEN level := 20;
  ELSIF total_xp >= 5000 THEN level := 15;
  ELSIF total_xp >= 2500 THEN level := 10;
  ELSIF total_xp >= 1950 THEN level := 9;
  ELSIF total_xp >= 1500 THEN level := 8;
  ELSIF total_xp >= 1100 THEN level := 7;
  ELSIF total_xp >= 750 THEN level := 6;
  
  -- Core onboarding levels (1-5) - HIGHEST TO LOWEST
  ELSIF total_xp >= 450 THEN level := 5;  -- Level 5: 450+ XP
  ELSIF total_xp >= 320 THEN level := 4;  -- Level 4: 320-449 XP  
  ELSIF total_xp >= 200 THEN level := 3;  -- Level 3: 200-319 XP
  ELSIF total_xp >= 100 THEN level := 2;  -- Level 2: 100-199 XP
  ELSE level := 1;  -- Level 1: 0-99 XP
  END IF;

  RETURN level;
END;
$$;

-- 1. SECURITY: Validate and sync user onboarding data (prevents tampering)
CREATE OR REPLACE FUNCTION validate_user_onboarding_data(p_user_id uuid)
RETURNS TABLE(
  current_level integer,
  total_xp integer,
  completed boolean,
  highest_level_achieved integer,
  last_validated_at timestamp with time zone
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_xp integer;
  v_calculated_level integer;
  v_settings jsonb;
  v_onboarding jsonb;
BEGIN
  -- Get actual XP from transactions (source of truth)
  SELECT COALESCE(SUM(amount), 0) 
  INTO v_total_xp
  FROM xp_transactions 
  WHERE user_id = p_user_id;

  -- Calculate correct level from XP (server-side only)
  SELECT calculate_level_from_xp(v_total_xp) INTO v_calculated_level;

  -- Get current settings
  SELECT settings INTO v_settings
  FROM user_settings 
  WHERE user_id = p_user_id;

  -- Build corrected onboarding data
  v_onboarding := jsonb_build_object(
    'current_level', v_calculated_level,
    'total_xp', v_total_xp,
    'completed', v_calculated_level >= 5,
    'highest_level_achieved', GREATEST(v_calculated_level, COALESCE((v_settings->'onboarding'->>'highest_level_achieved')::integer, 1)),
    'feature_exploration', COALESCE(v_settings->'onboarding'->'feature_exploration', '{}'::jsonb),
    'active_nudges', COALESCE(v_settings->'onboarding'->'active_nudges', '[]'::jsonb),
    'last_validated_at', now()
  );

  -- Update with validated data
  INSERT INTO user_settings (user_id, settings) 
  VALUES (p_user_id, jsonb_build_object('onboarding', v_onboarding))
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    settings = jsonb_set(
      COALESCE(user_settings.settings, '{}'::jsonb), 
      '{onboarding}', 
      v_onboarding
    ),
    updated_at = now();

  -- Return validated data
  RETURN QUERY SELECT 
    v_calculated_level,
    v_total_xp,
    (v_calculated_level >= 5),
    GREATEST(v_calculated_level, COALESCE((v_settings->'onboarding'->>'highest_level_achieved')::integer, 1)),
    now();
END;
$$;

-- 2. SECURITY: Get user level/XP (never trust client)
CREATE OR REPLACE FUNCTION get_user_level_xp(p_user_id uuid)
RETURNS TABLE(
  current_level integer,
  total_xp integer,
  xp_to_next_level integer,
  completed boolean
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_xp integer;
  v_current_level integer;
  v_next_level_xp integer;
BEGIN
  -- Get actual XP from transactions (authoritative source)
  SELECT COALESCE(SUM(amount), 0) 
  INTO v_total_xp
  FROM xp_transactions 
  WHERE user_id = p_user_id;

  -- Calculate level from XP (server-side validation)
  SELECT calculate_level_from_xp(v_total_xp) INTO v_current_level;

  -- Calculate XP needed for next level
  WITH level_requirements AS (
    SELECT * FROM (VALUES 
      (1, 0), (2, 100), (3, 200), (4, 320), (5, 450), 
      (6, 750), (7, 1100), (8, 1500), (9, 1950), (10, 2500),
      (15, 5000), (20, 8000), (25, 12000), (30, 18000), 
      (40, 35000), (50, 60000)
    ) AS t(level, xp_required)
  )
  SELECT COALESCE(lr.xp_required - v_total_xp, 0)
  INTO v_next_level_xp
  FROM level_requirements lr
  WHERE lr.level = v_current_level + 1;

  RETURN QUERY SELECT 
    v_current_level,
    v_total_xp,
    COALESCE(v_next_level_xp, 0),
    (v_current_level >= 5);
END;
$$;

-- 3. SECURITY: Award exploration XP (server-side only)
CREATE OR REPLACE FUNCTION award_exploration_xp(
  p_user_id uuid,
  p_feature_name text
)
RETURNS TABLE(
  xp_awarded integer,
  new_level integer,
  level_up boolean
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_settings jsonb;
  v_exploration jsonb;
  v_already_awarded boolean := false;
  v_xp_amount integer;
  v_award_result record;
BEGIN
  -- Check if XP already awarded for this feature
  SELECT settings INTO v_settings
  FROM user_settings 
  WHERE user_id = p_user_id;

  v_exploration := COALESCE(v_settings->'onboarding'->'feature_exploration'->p_feature_name, '{}'::jsonb);
  v_already_awarded := COALESCE((v_exploration->>'xp_rewarded')::boolean, false);

  IF v_already_awarded THEN
    -- Already awarded, return current level
    SELECT current_level, 0, false 
    INTO new_level, xp_awarded, level_up
    FROM get_user_level_xp(p_user_id);
    
    RETURN QUERY SELECT xp_awarded, new_level, level_up;
    RETURN;
  END IF;

  -- Determine XP amount based on feature
  v_xp_amount := CASE p_feature_name
    WHEN 'achievements' THEN 25
    WHEN 'chat' THEN 30
    WHEN 'analytics' THEN 35
    WHEN 'profile' THEN 40
    WHEN 'voice_commands' THEN 20
    ELSE 15
  END;

  -- Award XP using secure server function
  SELECT * INTO v_award_result
  FROM award_user_xp(
    p_user_id, 
    v_xp_amount, 
    'First visit to ' || p_feature_name, 
    'exploration',
    'feature_exploration'
  );

  -- Mark as awarded in settings
  v_exploration := jsonb_set(v_exploration, '{xp_rewarded}', 'true'::jsonb);
  v_exploration := jsonb_set(v_exploration, '{first_visit_at}', to_jsonb(now()));

  UPDATE user_settings 
  SET settings = jsonb_set(
    COALESCE(settings, '{}'::jsonb),
    array['onboarding', 'feature_exploration', p_feature_name],
    v_exploration
  )
  WHERE user_id = p_user_id;

  RETURN QUERY SELECT 
    v_award_result.xp_awarded,
    v_award_result.new_level,
    v_award_result.level_up;
END;
$$;

-- 4. SECURITY: Validate all user data integrity
CREATE OR REPLACE FUNCTION validate_user_data_integrity(p_user_id uuid)
RETURNS TABLE(
  issues_found integer,
  corrections_made text[],
  final_level integer,
  final_xp integer
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_corrections text[] := '{}';
  v_issues integer := 0;
  v_result record;
BEGIN
  -- Run validation and get corrected data
  SELECT * INTO v_result FROM validate_user_onboarding_data(p_user_id);
  
  -- Log any corrections made
  IF EXISTS (
    SELECT 1 FROM user_settings 
    WHERE user_id = p_user_id 
    AND (settings->'onboarding'->>'current_level')::integer != v_result.current_level
  ) THEN
    v_issues := v_issues + 1;
    v_corrections := array_append(v_corrections, 'Level corrected based on XP');
  END IF;

  RETURN QUERY SELECT 
    v_issues,
    v_corrections,
    v_result.current_level,
    v_result.total_xp;
END;
$$;

-- 5. SECURITY: Get XP progress with server-side validation
CREATE OR REPLACE FUNCTION get_user_xp_progress(p_user_id uuid)
RETURNS TABLE(
  current_level integer,
  total_xp integer,
  xp_progress_percentage integer,
  xp_needed_for_next_level integer,
  unlocked_features text[]
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_level_data record;
  v_current_level_xp integer;
  v_next_level_xp integer;
  v_xp_in_level integer;
  v_xp_range integer;
  v_progress_pct integer;
  v_features text[];
BEGIN
  -- Get validated level/XP data
  SELECT * INTO v_level_data FROM get_user_level_xp(p_user_id);
  
  -- Calculate XP requirements for current and next level
  WITH level_requirements AS (
    SELECT * FROM (VALUES 
      (1, 0), (2, 100), (3, 200), (4, 320), (5, 450), 
      (6, 750), (7, 1100), (8, 1500), (9, 1950), (10, 2500),
      (15, 5000), (20, 8000), (25, 12000), (30, 18000), 
      (40, 35000), (50, 60000)
    ) AS t(level, xp_required)
  )
  SELECT 
    COALESCE(curr.xp_required, 0),
    COALESCE(next.xp_required, 60000) -- Max level
  INTO v_current_level_xp, v_next_level_xp
  FROM level_requirements curr
  FULL OUTER JOIN level_requirements next ON next.level = curr.level + 1
  WHERE curr.level = v_level_data.current_level;

  -- Calculate progress percentage
  v_xp_in_level := v_level_data.total_xp - v_current_level_xp;
  v_xp_range := v_next_level_xp - v_current_level_xp;
  
  IF v_xp_range > 0 THEN
    v_progress_pct := LEAST(100, GREATEST(0, ROUND((v_xp_in_level::numeric / v_xp_range::numeric) * 100)));
  ELSE
    v_progress_pct := 100; -- Max level
  END IF;

  -- Get unlocked features based on level
  v_features := ARRAY['approvals']; -- Always available
  
  IF v_level_data.current_level >= 2 THEN v_features := array_append(v_features, 'achievements'); END IF;
  IF v_level_data.current_level >= 3 THEN v_features := array_append(v_features, 'chat'); END IF;
  IF v_level_data.current_level >= 3 THEN v_features := array_append(v_features, 'voice_commands'); END IF;
  IF v_level_data.current_level >= 4 THEN v_features := array_append(v_features, 'analytics'); END IF;
  IF v_level_data.current_level >= 5 THEN v_features := array_append(v_features, 'profile'); END IF;

  RETURN QUERY SELECT 
    v_level_data.current_level,
    v_level_data.total_xp,
    v_progress_pct,
    v_level_data.xp_to_next_level,
    v_features;
END;
$$;

-- 6. SECURITY: Server-side feature visit tracking
CREATE OR REPLACE FUNCTION record_feature_visit_secure(
  p_user_id uuid,
  p_feature_name text
)
RETURNS TABLE(
  xp_awarded integer,
  is_first_visit boolean,
  visit_count integer
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_settings jsonb;
  v_exploration jsonb;
  v_is_first_visit boolean := false;
  v_visit_count integer := 1;
  v_xp_result record;
BEGIN
  -- Get current exploration data
  SELECT settings INTO v_settings
  FROM user_settings 
  WHERE user_id = p_user_id;

  v_exploration := COALESCE(v_settings->'onboarding'->'feature_exploration'->p_feature_name, '{}'::jsonb);
  
  -- Check if this is first visit
  v_is_first_visit := v_exploration IS NULL OR v_exploration = '{}'::jsonb;
  v_visit_count := COALESCE((v_exploration->>'visit_count')::integer, 0) + 1;

  -- Update visit count
  v_exploration := jsonb_set(
    COALESCE(v_exploration, '{}'::jsonb),
    '{visit_count}',
    to_jsonb(v_visit_count)
  );

  IF v_is_first_visit THEN
    v_exploration := jsonb_set(v_exploration, '{first_visit_at}', to_jsonb(now()));
  END IF;

  -- Save updated exploration data
  UPDATE user_settings 
  SET settings = jsonb_set(
    COALESCE(settings, '{}'::jsonb),
    array['onboarding', 'feature_exploration', p_feature_name],
    v_exploration
  )
  WHERE user_id = p_user_id;

  -- Award XP if first visit and onboarding is complete
  xp_awarded := 0;
  IF v_is_first_visit THEN
    -- Check if onboarding is complete
    IF EXISTS (
      SELECT 1 FROM user_settings 
      WHERE user_id = p_user_id 
      AND (settings->'onboarding'->>'completed')::boolean = true
    ) THEN
      SELECT * INTO v_xp_result FROM award_exploration_xp(p_user_id, p_feature_name);
      xp_awarded := v_xp_result.xp_awarded;
    END IF;
  END IF;

  RETURN QUERY SELECT 
    xp_awarded,
    v_is_first_visit,
    v_visit_count;
END;
$$;

-- 7. SECURITY: Anti-tampering audit log
CREATE OR REPLACE FUNCTION log_security_event(
  p_user_id uuid,
  p_event_type text,
  p_details jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO data_operations_audit (
    user_id,
    operation_type,
    affected_tables,
    operation_metadata,
    legal_basis,
    ip_address,
    created_at
  ) VALUES (
    p_user_id,
    'SECURITY_EVENT',
    ARRAY['user_settings', 'xp_transactions'],
    jsonb_build_object(
      'event_type', p_event_type,
      'details', p_details,
      'source', 'anti_tampering_system'
    ),
    'security_monitoring',
    inet_client_addr(),
    now()
  );
END;
$$;

-- 8. SECURITY: Complete user sync (call this from client instead of local calculations)
CREATE OR REPLACE FUNCTION sync_user_onboarding_secure(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_validation_result record;
  v_progress_result record;
  v_settings jsonb;
  v_final_result jsonb;
BEGIN
  -- Step 1: Validate data integrity
  SELECT * INTO v_validation_result FROM validate_user_onboarding_data(p_user_id);
  
  -- Step 2: Get progress information
  SELECT * INTO v_progress_result FROM get_user_xp_progress(p_user_id);
  
  -- Step 3: Get additional settings
  SELECT settings INTO v_settings FROM user_settings WHERE user_id = p_user_id;
  
  -- Step 4: Build secure response
  v_final_result := jsonb_build_object(
    'onboarding', jsonb_build_object(
      'current_level', v_validation_result.current_level,
      'total_xp', v_validation_result.total_xp,
      'completed', v_validation_result.completed,
      'highest_level_achieved', v_validation_result.highest_level_achieved,
      'xp_progress_percentage', v_progress_result.xp_progress_percentage,
      'xp_needed_for_next_level', v_progress_result.xp_needed_for_next_level,
      'unlocked_features', v_progress_result.unlocked_features,
      'feature_exploration', COALESCE(v_settings->'onboarding'->'feature_exploration', '{}'::jsonb),
      'active_nudges', COALESCE(v_settings->'onboarding'->'active_nudges', '[]'::jsonb),
      'last_validated_at', v_validation_result.last_validated_at,
      'server_validated', true
    ),
    'holistic_preferences', COALESCE(v_settings->'holistic_preferences', '{}'::jsonb)
  );
  
  -- Step 5: Log security validation
  PERFORM log_security_event(
    p_user_id,
    'ONBOARDING_SYNC',
    jsonb_build_object(
      'level', v_validation_result.current_level,
      'xp', v_validation_result.total_xp,
      'completed', v_validation_result.completed
    )
  );
  
  RETURN v_final_result;
END;
$$;

-- 8. SECURITY: Complete onboarding reset (for debugging/testing)
CREATE OR REPLACE FUNCTION reset_user_onboarding_complete(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
BEGIN
  -- Log the reset action
  PERFORM log_security_event(
    p_user_id,
    'ONBOARDING_RESET',
    jsonb_build_object(
      'reset_timestamp', now(),
      'reason', 'debug_reset',
      'tables_cleared', ARRAY['xp_transactions', 'user_quote_responses', 'onboarding_sessions', 'user_settings']
    )
  );

  -- 1. Clear ALL XP transactions (source of truth)
  DELETE FROM xp_transactions WHERE user_id = p_user_id;
  
  -- 2. Clear quote responses
  DELETE FROM user_quote_responses WHERE user_id = p_user_id;
  
  -- 3. Clear onboarding sessions
  DELETE FROM onboarding_sessions WHERE user_id = p_user_id;
  
  -- 4. Reset user_settings to fresh onboarding state
  INSERT INTO user_settings (user_id, settings) 
  VALUES (p_user_id, jsonb_build_object(
    'onboarding', jsonb_build_object(
      'completed', false,
      'current_level', 1,
      'total_xp', 0,
      'onboarding_xp', 0,
      'highest_level_achieved', 1,
      'feature_exploration', jsonb_build_object(),
      'active_nudges', jsonb_build_array(),
      'reset_at', now()
    )
  ))
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    settings = jsonb_set(
      COALESCE(user_settings.settings, '{}'::jsonb), 
      '{onboarding}', 
      jsonb_build_object(
        'completed', false,
        'current_level', 1,
        'total_xp', 0,
        'onboarding_xp', 0,
        'highest_level_achieved', 1,
        'feature_exploration', jsonb_build_object(),
        'active_nudges', jsonb_build_array(),
        'reset_at', now()
      )
    ),
    updated_at = now();

  -- 5. Return confirmation
  v_result := jsonb_build_object(
    'success', true,
    'message', 'Onboarding completely reset',
    'reset_timestamp', now(),
    'new_state', jsonb_build_object(
      'level', 1,
      'xp', 0,
      'completed', false
    )
  );

  RETURN v_result;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION calculate_level_from_xp(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_user_onboarding_data(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_level_xp(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION award_exploration_xp(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_user_data_integrity(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_xp_progress(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION record_feature_visit_secure(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION log_security_event(uuid, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION sync_user_onboarding_secure(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION reset_user_onboarding_complete(uuid) TO authenticated; 