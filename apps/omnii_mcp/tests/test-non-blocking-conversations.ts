import { WorkflowManager } from "../src/services/workflow-manager";
import { redisCache } from "../src/services/redis-cache";
import {
  ActionPlan,
  ExecutionContext,
  WorkflowState,
  SystemActionType,
} from "../src/types/action-planning.types";

/**
 * Demonstrate non-blocking conversation threads
 */
async function testNonBlockingConversations() {
  console.log("🧪 Testing Non-Blocking Conversation Threads\n");

  const workflowManager = new WorkflowManager();

  // Check Redis availability
  if (!workflowManager.isAvailable()) {
    console.error("❌ Redis is not available. Cannot run test.");
    process.exit(1);
  }

  try {
    // Simulate User 1: Request with unknown entity
    console.log("📱 User 1 (+1234): 'Send email to Zogblar about the meeting'");

    const user1Plan: ActionPlan = {
      steps: [
        {
          type: "system",
          action: SystemActionType.USER_INTERVENTION,
          params: {
            reason:
              "I don't recognize 'Zogblar'. Please provide their email address:",
            entityToResolve: { type: "PERSON", value: "Zogblar" },
            timeout: 300,
          },
          description: "Resolve unknown entity: Zogblar",
          id: "intervention_1",
        },
        {
          type: "email",
          action: "create_draft",
          params: {
            recipient_email: "zogblar@resolved.com", // Will be resolved
            subject: "About the meeting",
          },
          description: "Draft email to Zogblar",
          id: "email_1",
          dependsOn: ["intervention_1"],
        },
      ],
      originalMessage: "Send email to Zogblar about the meeting",
      summary: "Email Zogblar about meeting",
      isMultiStep: true,
    };

    const user1Context: ExecutionContext = {
      entityId: "user1@example.com",
      phoneNumber: "+1234",
      userTimezone: "America/Los_Angeles",
      stepResults: new Map(),
      currentStepIndex: 0,
      entities: [{ type: "PERSON", value: "Zogblar" }],
      sessionId: "session_user1_123",
    };

    // Create workflow for User 1
    const workflow1 = await workflowManager.createWorkflow(
      user1Context.sessionId,
      user1Context.phoneNumber,
      user1Plan,
      user1Context
    );

    console.log(`✅ Created workflow for User 1: ${workflow1.sessionId}`);
    console.log(`   Status: ${workflow1.status}`);

    // Simulate execution hitting intervention
    await workflowManager.setInterventionState(
      workflow1.sessionId,
      "intervention_1",
      "I don't recognize 'Zogblar'. Please provide their email address:",
      { type: "PERSON", value: "Zogblar" }
    );

    console.log("⏸️  User 1 workflow waiting for intervention\n");

    // Simulate User 2: Normal request (no intervention needed)
    console.log("📱 User 2 (+5678): 'Schedule meeting tomorrow at 3pm'");

    const user2Plan: ActionPlan = {
      steps: [
        {
          type: "calendar",
          action: "create_event",
          params: {
            title: "Meeting",
            date: "tomorrow",
            time: "3pm",
          },
          description: "Create calendar event",
          id: "calendar_1",
        },
      ],
      originalMessage: "Schedule meeting tomorrow at 3pm",
      summary: "Schedule meeting",
      isMultiStep: false,
    };

    const user2Context: ExecutionContext = {
      entityId: "user2@example.com",
      phoneNumber: "+5678",
      userTimezone: "America/New_York",
      stepResults: new Map(),
      currentStepIndex: 0,
      entities: [],
      sessionId: "session_user2_456",
    };

    // Create workflow for User 2
    const workflow2 = await workflowManager.createWorkflow(
      user2Context.sessionId,
      user2Context.phoneNumber,
      user2Plan,
      user2Context
    );

    console.log(`✅ Created workflow for User 2: ${workflow2.sessionId}`);
    console.log(`   Status: ${workflow2.status}`);

    // Simulate User 2 workflow completing
    await workflowManager.addStepResult(workflow2.sessionId, {
      success: true,
      data: { eventId: "event123" },
      message: "Meeting scheduled for tomorrow at 3pm",
      stepId: "calendar_1",
    });
    await workflowManager.completeWorkflow(workflow2.sessionId);

    console.log("✅ User 2 workflow completed successfully!\n");

    // Check active workflows
    console.log("📊 Active Workflows Status:");
    const user1Active = await workflowManager.getActiveWorkflows("+1234");
    const user2Active = await workflowManager.getActiveWorkflows("+5678");

    console.log(`   User 1 (+1234): ${user1Active.length} active workflows`);
    if (user1Active.length > 0) {
      console.log(
        `     - ${user1Active[0].sessionId}: ${user1Active[0].status}`
      );
    }

    console.log(`   User 2 (+5678): ${user2Active.length} active workflows\n`);

    // Simulate User 1 responding to intervention
    console.log("📱 User 1 (+1234): 'zogblar@alien.com'");

    // Find User 1's waiting workflow
    const waitingWorkflow = await workflowManager.findWaitingIntervention(
      "+1234"
    );
    if (waitingWorkflow) {
      console.log(`   Found waiting workflow: ${waitingWorkflow.sessionId}`);

      // Clear intervention and continue
      await workflowManager.clearInterventionState(waitingWorkflow.sessionId);

      // Cache the resolved entity
      const entityKey = `entity:+1234:PERSON:Zogblar`;
      await redisCache.set(
        entityKey,
        {
          email: "zogblar@alien.com",
          resolvedAt: Date.now(),
        },
        3600
      );
      console.log(`   Cached resolved entity: ${entityKey}`);

      // Simulate continuing workflow
      await workflowManager.addStepResult(waitingWorkflow.sessionId, {
        success: true,
        data: { resolvedValue: "zogblar@alien.com" },
        message: "Resolved: zogblar@alien.com",
        stepId: "intervention_1",
      });

      await workflowManager.addStepResult(waitingWorkflow.sessionId, {
        success: true,
        data: { draftId: "draft123" },
        message: "Draft created for zogblar@alien.com",
        stepId: "email_1",
      });

      await workflowManager.completeWorkflow(waitingWorkflow.sessionId);
      console.log("✅ User 1 workflow resumed and completed!\n");
    }

    // Final status check
    console.log("📊 Final Status:");
    const finalUser1 = await workflowManager.getActiveWorkflows("+1234");
    const finalUser2 = await workflowManager.getActiveWorkflows("+5678");

    console.log(`   User 1 (+1234): ${finalUser1.length} active workflows`);
    console.log(`   User 2 (+5678): ${finalUser2.length} active workflows`);

    // Check cached entity
    const cachedEntity = await redisCache.get("entity:+1234:PERSON:Zogblar");
    console.log("\n🗄️  Cached Entity:");
    console.log(`   Zogblar:`, cachedEntity);

    console.log("\n✨ Key Benefits Demonstrated:");
    console.log("   1. User 2's request completed while User 1 was waiting");
    console.log("   2. No blocking threads - both users handled independently");
    console.log("   3. Workflow state persisted in Redis");
    console.log("   4. Entity resolution cached for future use");
    console.log("   5. Clean workflow lifecycle management");
  } catch (error) {
    console.error("❌ Test failed:", error);
  }

  console.log("\n🧹 Test complete");
  process.exit(0);
}

// Run the test
testNonBlockingConversations().catch(console.error);
