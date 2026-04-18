import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { PrimaryButton } from './reusable/PrimaryButton';
import { BORDER_RADIUS, COLORS, FONT_SIZES, SPACING, themeStyle } from './constants/theme';
import InputField from './reusable/InputField';


/**
 * THEME USAGE EXAMPLES
 * 
 * This file demonstrates how to use the enhanced theme system
 * throughout your application.
 */

const ThemeExamplesScreen = () => {
  return (
    <ScrollView style={themeStyle.container}>
      <View style={themeStyle.scrollContainer}>
        
        {/* EXAMPLE 1: Using predefined text styles */}
        <View style={[themeStyle.card, themeStyle.mb4]}>
          <Text style={themeStyle.titleText}>Title Text</Text>
          <Text style={themeStyle.headingText}>Heading Text</Text>
          <Text style={themeStyle.subheadingText}>Subheading Text</Text>
          <Text style={themeStyle.bodyText}>
            Body text with proper line height and spacing.
          </Text>
          <Text style={themeStyle.mutedText}>Muted secondary text</Text>
          <Text style={themeStyle.captionText}>Caption text for small labels</Text>
        </View>

        {/* EXAMPLE 2: Using spacing utilities */}
        <View style={[themeStyle.card, themeStyle.mb4]}>
          <Text style={[themeStyle.headingText, themeStyle.mb3]}>
            Spacing Utilities
          </Text>
          <View style={themeStyle.mb2}>
            <Text style={themeStyle.bodyText}>Item with mb2</Text>
          </View>
          <View style={themeStyle.mb4}>
            <Text style={themeStyle.bodyText}>Item with mb4</Text>
          </View>
          <View style={[themeStyle.p4, { backgroundColor: COLORS.surface }]}>
            <Text style={themeStyle.bodyText}>Container with p4 padding</Text>
          </View>
        </View>

        {/* EXAMPLE 3: Button variants */}
        <View style={[themeStyle.card, themeStyle.mb4]}>
          <Text style={[themeStyle.headingText, themeStyle.mb3]}>
            Button Variants
          </Text>
          
          <View style={themeStyle.mb3}>
            <PrimaryButton 
              title="Primary Button" 
              onPress={() => {}}
            />
          </View>
          
          <View style={themeStyle.mb3}>
            <PrimaryButton
              title="Outline Button" 
              variant="outline"
              onPress={() => {}}
            />
          </View>
          
          <View style={themeStyle.mb3}>
            <PrimaryButton 
              title="Loading Button" 
              loading
              onPress={() => {}}
            />
          </View>

          <View style={themeStyle.mb3}>
            <PrimaryButton 
              title="Large Button" 
              size="large"
              onPress={() => {}}
            />
          </View>

          <View style={themeStyle.row}>
            <View style={{ flex: 1, marginRight: SPACING.sm }}>
              <PrimaryButton 
                title="Small" 
                size="small"
                onPress={() => {}}
              />
            </View>
            <View style={{ flex: 1 }}>
              <PrimaryButton 
                title="Small 2" 
                size="small"
                variant="outline"
                onPress={() => {}}
              />
            </View>
          </View>
        </View>

        {/* EXAMPLE 4: Cards with different elevations */}
        <View style={themeStyle.mb4}>
          <Text style={[themeStyle.headingText, themeStyle.mb3]}>
            Card Elevations
          </Text>
          
          <View style={[themeStyle.surface, themeStyle.mb3]}>
            <Text style={themeStyle.bodyText}>Surface (no elevation)</Text>
          </View>
          
          <View style={[themeStyle.card, themeStyle.mb3]}>
            <Text style={themeStyle.bodyText}>Card (medium elevation)</Text>
          </View>
          
          <View style={themeStyle.cardElevated}>
            <Text style={themeStyle.bodyText}>Card Elevated (high shadow)</Text>
          </View>
        </View>

        {/* EXAMPLE 5: Flex utilities */}
        <View style={[themeStyle.card, themeStyle.mb4]}>
          <Text style={[themeStyle.headingText, themeStyle.mb3]}>
            Flex Utilities
          </Text>
          
          <View style={[themeStyle.rowSpaceBetween, themeStyle.mb2]}>
            <Text style={themeStyle.bodyText}>Left</Text>
            <Text style={themeStyle.bodyText}>Right</Text>
          </View>
          
          <View style={themeStyle.row}>
            <TouchableOpacity style={[themeStyle.iconButton, { marginRight: SPACING.sm }]}>
              <Text>🏠</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[themeStyle.iconButton, { marginRight: SPACING.sm }]}>
              <Text>⭐</Text>
            </TouchableOpacity>
            <TouchableOpacity style={themeStyle.iconButtonPrimary}>
              <Text>❤️</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* EXAMPLE 6: Badges and Tags */}
        <View style={[themeStyle.card, themeStyle.mb4]}>
          <Text style={[themeStyle.headingText, themeStyle.mb3]}>
            Badges & Tags
          </Text>
          
          <View style={[themeStyle.rowWrap, { gap: SPACING.sm, marginBottom: SPACING.md }]}>
            <View style={themeStyle.badge}>
              <Text style={themeStyle.badgeText}>NEW</Text>
            </View>
            <View style={[themeStyle.badge, { backgroundColor: COLORS.success }]}>
              <Text style={themeStyle.badgeText}>ACTIVE</Text>
            </View>
            <View style={[themeStyle.badge, { backgroundColor: COLORS.error }]}>
              <Text style={themeStyle.badgeText}>URGENT</Text>
            </View>
          </View>
          
          <View style={[themeStyle.rowWrap, { gap: SPACING.sm }]}>
            <View style={themeStyle.tag}>
              <Text style={themeStyle.tagText}>Genesis</Text>
            </View>
            <View style={themeStyle.tag}>
              <Text style={themeStyle.tagText}>Prayer</Text>
            </View>
            <View style={themeStyle.tag}>
              <Text style={themeStyle.tagText}>Study</Text>
            </View>
          </View>
        </View>

        {/* EXAMPLE 7: Custom styling with theme constants */}
        <View style={[
          themeStyle.card,
          themeStyle.mb4,
          {
            borderWidth: 2,
            borderColor: COLORS.primary,
          }
        ]}>
          <Text style={[themeStyle.headingText, themeStyle.mb2]}>
            Custom Styling
          </Text>
          <Text style={themeStyle.bodyText}>
            You can combine theme styles with custom styling using theme constants
          </Text>
          <View style={[
            themeStyle.mt3,
            {
              padding: SPACING.md,
              borderRadius: BORDER_RADIUS.sm,
              backgroundColor: COLORS.primary + '20',
            }
          ]}>
            <Text style={{ color: COLORS.primary, fontSize: FONT_SIZES.sm }}>
              Using SPACING, BORDER_RADIUS, and COLORS constants
            </Text>
          </View>
        </View>

        {/* EXAMPLE 8: Input fields with labels */}
        <View style={[themeStyle.card, themeStyle.mb4]}>
          <Text style={[themeStyle.headingText, themeStyle.mb3]}>
            Input Fields
          </Text>
          
          <View style={themeStyle.mb3}>
           
            <InputField 
              placeholder="Enter email"
              value=""
              onChangeText={() => {}}
              label='good'
            />
          </View>
          
          <View style={themeStyle.mb3}>
            <Text style={[themeStyle.bodyText, themeStyle.mb2]}>Password</Text>
            <InputField 
              placeholder="Enter password"
              value=""
              secure
              onChangeText={() => {}}
            />
          </View>
          
          <View>
            <Text style={[themeStyle.bodyText, themeStyle.mb2]}>With Error</Text>
            <InputField
              placeholder="Invalid field"
              value="test"
              error="This field is required"
              onChangeText={() => {}}
            />
          </View>
        </View>

        {/* EXAMPLE 9: Dividers */}
        <View style={[themeStyle.card, themeStyle.mb5]}>
          <Text style={themeStyle.bodyText}>Content above</Text>
          <View style={themeStyle.divider} />
          <Text style={themeStyle.bodyText}>Content below</Text>
          <View style={themeStyle.dividerThick} />
          <Text style={themeStyle.bodyText}>Content with thick divider</Text>
        </View>

      </View>
    </ScrollView>
  );
};

export default ThemeExamplesScreen;