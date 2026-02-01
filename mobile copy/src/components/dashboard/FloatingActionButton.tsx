import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { fontWeight } from '../../lib/theme';

const { width, height } = Dimensions.get('window');

interface Action {
  id: string;
  label: string;
  icon: string;
  color: string;
  route?: string;
}

interface FloatingActionButtonProps {
  actions: Action[];
  navigation?: any;
}

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({ actions, navigation }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [animation] = useState(new Animated.Value(0));
  const { colors } = useTheme();

  const toggleMenu = () => {
    const toValue = isOpen ? 0 : 1;
    Animated.spring(animation, {
      toValue,
      friction: 7,
      tension: 50,
      useNativeDriver: true,
    }).start();
    setIsOpen(!isOpen);
  };

  const handleActionPress = (action: Action) => {
    toggleMenu();
    setTimeout(() => {
      if (action.route && navigation) {
        navigation.navigate(action.route);
      }
    }, 200);
  };

  const rotation = animation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

  const backdropOpacity = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  // Vertical stack positions - 4 actions going straight up
  const getActionPosition = (index: number) => {
    const spacing = 70; // Vertical spacing between buttons
    
    return {
      x: 0, // No horizontal movement
      y: -(spacing * (index + 1)), // Stack vertically upward
    };
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <Animated.View 
          style={[styles.backdrop, { opacity: backdropOpacity }]}
          pointerEvents={isOpen ? 'auto' : 'none'}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={toggleMenu}
          />
        </Animated.View>
      )}

      {/* FAB Container */}
      <View style={styles.container} pointerEvents="box-none">
        {/* Action Buttons */}
        {actions.map((action, index) => {
          const position = getActionPosition(index);
          
          const translateX = animation.interpolate({
            inputRange: [0, 1],
            outputRange: [0, position.x],
          });

          const translateY = animation.interpolate({
            inputRange: [0, 1],
            outputRange: [0, position.y],
          });

          const scale = animation.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 1],
          });

          const opacity = animation.interpolate({
            inputRange: [0, 0.3, 1],
            outputRange: [0, 0, 1],
          });

          return (
            <Animated.View
              key={action.id}
              style={[
                styles.actionContainer,
                {
                  transform: [
                    { translateX },
                    { translateY },
                    { scale },
                  ],
                  opacity,
                },
              ]}
              pointerEvents={isOpen ? 'auto' : 'none'}
            >
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: action.color, shadowColor: action.color }]}
                onPress={() => handleActionPress(action)}
                activeOpacity={0.8}
              >
                <Ionicons name={action.icon as any} size={20} color="white" />
              </TouchableOpacity>
            </Animated.View>
          );
        })}

        {/* Main FAB */}
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.accent, shadowColor: colors.accent }]}
          onPress={toggleMenu}
          activeOpacity={0.9}
        >
          <Animated.View style={{ transform: [{ rotate: rotation }] }}>
            <Ionicons name="add" size={26} color="white" />
          </Animated.View>
        </TouchableOpacity>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.2)',
    zIndex: 999,
  },
  container: {
    position: 'absolute',
    bottom: 30,
    right: 24,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  actionContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
});
