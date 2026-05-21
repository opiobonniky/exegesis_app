import firestore from '@react-native-firebase/firestore';

export const getLatestAppVersion = async (): Promise<string | null> => {
  try {
    // Option A: fetch by known document ID (recommended — fast, cheap, reliable)
    const doc:any = await firestore()
      .collection('exegesis')
      .doc('U4klPijmUd3B2vEw2ivk') // use your actual doc ID
      .get();

    if (doc.exists) {
      const version = doc.data()?.version;
      if (!version) {
        console.warn('Version field missing in document.');
        return null;
      }
      return version as string;
    }

    console.warn('No version document found.');
    return null;
  } catch (error:any) {
    console.error('Error fetching app version:', error.message);
    return null;
  }
};