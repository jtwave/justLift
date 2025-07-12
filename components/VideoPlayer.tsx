import React from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { Colors } from '@/constants/Colors';

interface VideoPlayerProps {
  uri: string;
  style?: any;
}

export function VideoPlayer({ uri, style }: VideoPlayerProps) {
  // For now, we'll display a placeholder image instead of video
  // This avoids video playback issues on web/laptop platforms
  const placeholderImageUri = 'https://images.pexels.com/photos/1552242/pexels-photo-1552242.jpeg?auto=compress&cs=tinysrgb&w=800';

  return (
    <View style={[styles.container, style]}>
      <Image 
        source={{ uri: placeholderImageUri }}
        style={styles.image}
        resizeMode="cover"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    backgroundColor: Colors.background,
  },
  image: {
    width: '100%',
    height: '100%',
  },
});