import firestore from '@react-native-firebase/firestore';
import { Platform } from 'react-native';

export const getLatestAppVersion = async (): Promise<string | null> => {
  try {
    const doc = await firestore()
      .collection('exegesis')
      .doc('U4klPijmUd3B2vEw2ivk')
      .get();

    const data = doc.data();
    // Return the right version field per platform
    return Platform.OS === 'android' 
      ? data?.androidVersion 
      : data?.iosVersion;
  } catch (error) {
    return null;
  }
};