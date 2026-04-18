/**
 * @format
 */
import 'react-native-gesture-handler';
import { AppRegistry } from 'react-native';
import notifee from '@notifee/react-native';
import App from './App';
import { name as appName } from './app.json';
import { notifeeBackgroundEventHandler } from './src/services/notifications/notifeeBackground';


// Must be registered at the entry-point for events to work when the app is
// closed / killed (Headless JS).
notifee.onBackgroundEvent(notifeeBackgroundEventHandler);

AppRegistry.registerComponent(appName, () => App);
