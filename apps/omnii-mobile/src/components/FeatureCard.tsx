import { View, Text } from 'react-native';
import { CircleCheck as CheckCircle, Bell, Clock, Shield } from 'lucide-react-native';
import { cn } from '~/utils/cn';

interface FeatureCardProps {
  title: string;
  description: string;
  icon: string;
  className?: string;
}

export default function FeatureCard({ title, description, icon, className }: FeatureCardProps) {
  const renderIcon = () => {
    const iconColor = '#007AFF';
    const iconSize = 24;
    
    switch (icon) {
      case 'check-circle':
        return <CheckCircle size={iconSize} color={iconColor} />;
      case 'bell':
        return <Bell size={iconSize} color={iconColor} />;
      case 'clock':
        return <Clock size={iconSize} color={iconColor} />;
      case 'shield':
        return <Shield size={iconSize} color={iconColor} />;
      default:
        return <CheckCircle size={iconSize} color={iconColor} />;
    }
  };

  return (
    <View className={cn("omnii-card mb-4", className)}>
      <View className="flex-row items-center mb-3">
        <View className="w-10 h-10 rounded-full bg-blue-50 justify-center items-center mr-3">
          {renderIcon()}
        </View>
        <Text className="omnii-heading text-base flex-1">{title}</Text>
      </View>
      <Text className="omnii-body text-sm leading-5">{description}</Text>
    </View>
  );
}