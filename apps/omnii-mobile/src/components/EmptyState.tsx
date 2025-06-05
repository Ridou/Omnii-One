import { View, Text } from 'react-native';
import { CircleAlert as AlertCircle, CircleCheck as CheckCircle, History } from 'lucide-react-native';
import { cn } from '~/utils/cn';

interface EmptyStateProps {
  title: string;
  message: string;
  icon: string;
  className?: string; // Optional additional styling
}

export default function EmptyState({ title, message, icon, className }: EmptyStateProps) {
  const renderIcon = () => {
    const iconColor = '#8E8E93'; // Using existing color for consistency
    const iconSize = 48;
    
    switch (icon) {
      case 'check-circle':
        return <CheckCircle size={iconSize} color={iconColor} />;
      case 'history':
        return <History size={iconSize} color={iconColor} />;
      default:
        return <AlertCircle size={iconSize} color={iconColor} />;
    }
  };

  return (
    <View className={cn(
      "flex-1 justify-center items-center p-6",
      className
    )}>
      <View className="mb-4">
        {renderIcon()}
      </View>
      
      <Text className="omnii-heading text-lg text-center mb-2 text-omnii-text-primary">
        {title}
      </Text>
      
      <Text className="omnii-caption text-center max-w-[80%] text-omnii-text-secondary">
        {message}
      </Text>
    </View>
  );
}