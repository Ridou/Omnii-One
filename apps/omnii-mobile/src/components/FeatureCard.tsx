import { View, Text } from 'react-native';
import { CircleCheck as CheckCircle, Bell, Clock, Shield } from 'lucide-react-native';
import { cn } from '~/utils/cn';

interface FeatureCardProps {
  title: string;
  description: string;
  icon: string;
  className?: string;
  badge?: React.ReactNode;
  children?: React.ReactNode;
}

export default function FeatureCard({ title, description, icon, className, badge, children }: FeatureCardProps) {
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
    <View className={cn("card-omnii mb-4", className)}>
      <View className="flex-row items-center justify-between">
        {icon && <View className="mr-3">{renderIcon()}</View>}
        <Text className="text-omnii-heading text-base flex-1">{title}</Text>
        {badge && <View className="ml-2">{badge}</View>}
      </View>
      <Text className="text-omnii-body text-sm leading-5">{description}</Text>
      {children && <View className="mt-3">{children}</View>}
    </View>
  );
}