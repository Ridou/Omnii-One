import { StyleSheet, View, Text, Image, Dimensions } from 'react-native';

export default function LandingHero() {
  const windowWidth = Dimensions.get('window').width;
  
  const styles = StyleSheet.create({
    container: {
      width: '100%',
      height: 300,
      position: 'relative',
      marginBottom: 24,
    },
    backgroundImage: {
      position: 'absolute',
      width: '100%',
      height: '100%',
    },
    overlay: {
      position: 'absolute',
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    title: {
      fontSize: 32,
      fontWeight: '700',
      color: '#FFFFFF',
      textAlign: 'center',
      marginBottom: 16,
    },
    subtitle: {
      fontSize: 18,
      color: '#FFFFFF',
      textAlign: 'center',
      lineHeight: 24,
    },
  });

  return (
    <View style={styles.container}>
      <Image
        source={{ uri: 'https://images.pexels.com/photos/3182812/pexels-photo-3182812.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=750&w=1260' }}
        style={styles.backgroundImage}
        resizeMode="cover"
      />
      <View style={styles.overlay}>
        <Text style={styles.title}>ApprovalFlow</Text>
        <Text style={styles.subtitle}>
          Streamline your workflow tasks with our mobile-first platform.
          Approve requests quickly, anywhere, anytime.
        </Text>
      </View>
    </View>
  );
}