import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Platform,
} from 'react-native';
import { cn } from '~/utils/cn';
import { useTheme } from '~/context/ThemeContext';

interface CrossPlatformDatePickerProps {
  value: Date;
  onChange: (date: Date) => void;
  onClose: () => void;
  visible: boolean;
  minimumDate?: Date;
  maximumDate?: Date;
  title?: string;
}

export const CrossPlatformDatePicker: React.FC<CrossPlatformDatePickerProps> = ({
  value,
  onChange,
  onClose,
  visible,
  minimumDate,
  maximumDate,
  title = 'Select Date',
}) => {
  const { isDark } = useTheme();
  const [tempDate, setTempDate] = useState(value);
  const [webDateInput, setWebDateInput] = useState(
    value.toISOString().split('T')[0]
  );

  // For web platform, use HTML date input
  if (Platform.OS === 'web') {
    if (!visible) return null;

    return (
      <Modal
        transparent
        animationType="fade"
        visible={visible}
        onRequestClose={onClose}
      >
        <TouchableOpacity
          className="flex-1 justify-center items-center bg-black/50"
          activeOpacity={1}
          onPress={onClose}
        >
          <View
            className={cn(
              'w-80 rounded-2xl p-6',
              isDark ? 'bg-slate-800' : 'bg-white'
            )}
            onStartShouldSetResponder={() => true}
          >
            <Text
              className={cn(
                'text-lg font-semibold text-center mb-4',
                isDark ? 'text-white' : 'text-gray-900'
              )}
            >
              {title}
            </Text>

            <input
              type="date"
              value={webDateInput}
              onChange={(e) => {
                const dateValue = e.target.value;
                setWebDateInput(dateValue);
                const newDate = new Date(dateValue + 'T00:00:00');
                setTempDate(newDate);
              }}
              min={minimumDate?.toISOString().split('T')[0]}
              max={maximumDate?.toISOString().split('T')[0]}
              className={cn(
                'w-full px-4 py-3 rounded-lg border text-base',
                isDark
                  ? 'bg-slate-700 border-slate-600 text-white'
                  : 'bg-gray-50 border-gray-300 text-gray-900'
              )}
              style={{ WebkitAppearance: 'none' }}
            />

            <View className="flex-row justify-between mt-6">
              <TouchableOpacity onPress={onClose} className="px-4 py-2">
                <Text
                  className={cn(
                    'text-base',
                    isDark ? 'text-slate-400' : 'text-gray-600'
                  )}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  onChange(tempDate);
                  onClose();
                }}
                className="px-4 py-2"
              >
                <Text className="text-base text-blue-500 font-medium">
                  Done
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    );
  }

  // iOS - Simple text-based date selector (no DateTimePicker dependency)
  if (Platform.OS === 'ios') {
    return (
      <Modal
        transparent
        animationType="slide"
        visible={visible}
        onRequestClose={onClose}
      >
        <View className="flex-1 justify-end">
          <View
            className={cn(
              'rounded-t-2xl p-6',
              isDark ? 'bg-slate-800' : 'bg-white'
            )}
          >
            <View className="flex-row justify-between items-center mb-4">
              <TouchableOpacity onPress={onClose}>
                <Text
                  className={cn(
                    'text-base',
                    isDark ? 'text-slate-400' : 'text-gray-600'
                  )}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
              <Text
                className={cn(
                  'text-base font-medium',
                  isDark ? 'text-white' : 'text-gray-900'
                )}
              >
                {title}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  onChange(tempDate);
                  onClose();
                }}
              >
                <Text className="text-base text-blue-500">Done</Text>
              </TouchableOpacity>
            </View>
            
            <View className="items-center py-8">
              <Text
                className={cn(
                  'text-2xl font-semibold',
                  isDark ? 'text-white' : 'text-gray-900'
                )}
              >
                📅 {tempDate.toLocaleDateString()}
              </Text>
              <Text
                className={cn(
                  'text-sm mt-2',
                  isDark ? 'text-slate-400' : 'text-gray-600'
                )}
              >
                Tap Done to select this date
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  return null;
};

interface DatePickerButtonProps {
  date: Date | null;
  onDateChange: (date: Date | null) => void;
  placeholder?: string;
  minimumDate?: Date;
  maximumDate?: Date;
  className?: string;
}

export const DatePickerButton: React.FC<DatePickerButtonProps> = ({
  date,
  onDateChange,
  placeholder = 'Select date',
  minimumDate,
  maximumDate,
  className,
}) => {
  const { isDark } = useTheme();
  const [showPicker, setShowPicker] = useState(false);

  return (
    <>
      <TouchableOpacity
        onPress={() => setShowPicker(true)}
        className={cn(
          'flex-row items-center px-3 py-2 rounded-lg border',
          isDark
            ? 'bg-slate-800 border-slate-600'
            : 'bg-white border-gray-300',
          className
        )}
      >
        <Text
          className={cn(
            'text-sm flex-1',
            date
              ? isDark
                ? 'text-white'
                : 'text-gray-900'
              : isDark
                ? 'text-slate-400'
                : 'text-gray-500'
          )}
        >
          {date
            ? `📅 ${date.toLocaleDateString()}`
            : `📅 ${placeholder}`}
        </Text>
        {date && (
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              onDateChange(null);
            }}
            className="ml-2"
          >
            <Text
              className={cn(
                'text-sm',
                isDark ? 'text-slate-400' : 'text-gray-500'
              )}
            >
              ✕
            </Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>

      <CrossPlatformDatePicker
        visible={showPicker}
        value={date || new Date()}
        onChange={(newDate) => {
          onDateChange(newDate);
          setShowPicker(false);
        }}
        onClose={() => setShowPicker(false)}
        minimumDate={minimumDate}
        maximumDate={maximumDate}
      />
    </>
  );
};