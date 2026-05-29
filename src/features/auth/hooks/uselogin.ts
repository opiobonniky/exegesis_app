import { useState, useEffect } from 'react';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { sendPostRequest } from '../../../services/api';
import { showToast } from '../../../helpers/Toash.helper';
import { useNavigation } from '@react-navigation/native';
import { route } from '../../../component/navigations/routes';
import { AppContext, UserInfo } from '../../../common/AppContext';
import { useContext } from 'react';
import { useLanguage } from '../../../component/language-translation/LanguageProvider';

export default function useLogin() {
  const navigation = useNavigation<any>();
  const appContext = useContext(AppContext);
  const { setUserInfo } = appContext || ({} as any);
  const { translations } = useLanguage();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>(
    {},
  );
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleUser, setGoogleUser] = useState<any>(null);
  const [passwordVisible, setPasswordVisible] = useState(false);

  useEffect(() => {
    GoogleSignin.configure({
      webClientId:
        '683836491679-f2lflbbbh2hnthd53h9eq2qjuaetcjjg.apps.googleusercontent.com',
      iosClientId:
        '683836491679-k1i0usjv73havp5o79k9ib23t98fse8q.apps.googleusercontent.com',
    });
  }, []);

  const submitGoogleLogin = async (idToken: string, user?: any) => {
    try {
      const response = await sendPostRequest('auth', 'google-login', {
        idToken,
        email: user?.email,
        firstName: user?.givenName,
        lastName: user?.familyName,
        photoUrl: user?.photo,
      });

      const { returnCode, returnMessage, returnData } = response;

      if (returnCode === 200) {
        const info: UserInfo = {
          token: returnData.token,
          tokenType: returnData.tokenType,
          username: returnData.username,
          email: returnData.email,
          firstName: returnData.firstName,
          lastName: returnData.lastName,
          profilePhotoUrl: returnData.profilePhotoUrl,
          userRole: returnData.userRole,
          roleName: returnData.roleName,
        };

        const dashboardRoute =
          info.userRole === 1 ? route.adminDashboardLogin : route.homeLogin;

        await setUserInfo(info);
        navigation.navigate(dashboardRoute);
      } else if (returnCode === 201 && returnData?.needsRegistration) {
        navigation.navigate(route.googleRegister, {
          googleId: returnData.googleId,
          email: returnData.email,
          firstName: returnData.firstName,
          lastName: returnData.lastName,
          photoUrl: returnData.photoUrl,
        });
      } else {
        showToast(
          'error',
          returnMessage ||
            translations?.errors?.googleFailed ||
            'Google sign-in failed',
        );
        setGoogleUser(null);
      }
    } catch (error: any) {
      console.log('Google Sign-In Error:', error);
      showToast(
        'error',
        error?.message ||
          translations?.errors?.googleFailed ||
          'Google sign-in failed',
      );
      setGoogleUser(null);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setGoogleUser(null);
    try {
      await GoogleSignin.signOut();
      await GoogleSignin.hasPlayServices({
        showPlayServicesUpdateDialog: true,
      });
      const signInResult = await GoogleSignin.signIn();
      const { idToken, user }:any = signInResult.data;
      if (!idToken) {
        const msg = translations?.errors?.noIdToken || 'No ID token found';
        throw new Error(msg);
      }
      setGoogleUser(user);
      await submitGoogleLogin(idToken, user);
    } catch (error: any) {
      showToast('warning', "You canceled the google sign-in process.");
    } finally {
      setGoogleLoading(false);
    }
  };

  const validate = () => {
    const e: { email?: string; password?: string } = {};
    if (!email.trim()) e.email = translations.validation.emailRequired;
    else if (!/\S+@\S+\.\S+/.test(email))
      e.email = translations.validation.invalidEmail;
    if (!password) e.password = translations.validation.passwordRequired;
    else if (password.length < 6)
      e.password = translations.validation.passwordMin;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const response = await sendPostRequest('auth', 'login', {
        username: email.toLowerCase().trim(),
        password,
      });
      const { returnCode, returnMessage, returnData } = response;

      if (returnCode === 200) {
        const info: UserInfo = {
          token: returnData.token,
          tokenType: returnData.tokenType,
          username: returnData.username,
          email: returnData.email,
          firstName: returnData.firstName,
          lastName: returnData.lastName,
          profilePhotoUrl: returnData.profilePhotoUrl,
          userRole: returnData.userRole,
          roleName: returnData.roleName,
        };

        const dashboardRoute =
          info.userRole === 1 ? route.adminDashboardLogin : route.homeLogin;

        await setUserInfo(info);
        navigation.navigate(dashboardRoute);
      } else if (returnCode === 405) {
        showToast(
          'warning',
          returnMessage || translations?.errors?.warning || returnMessage,
        );
        setTimeout(() => {
          navigation.navigate(route.register, {
            emailVerify: email,
            tab: 'verify',
          });
        }, 4000);
      } else {
        showToast(
          'error',
          returnMessage || translations?.errors?.unknown || 'Unknown error',
        );
      }
    } catch (error: any) {
      const returnCode = error?.returnCode;
      const returnMessage =
        error?.message ||
        translations?.errors?.unexpected ||
        'An unexpected error occurred';

      if (returnCode === 405) {
        showToast('warning', returnMessage);
        setTimeout(() => {
          navigation.navigate(route.register, {
            emailVerify: email,
            tab: 'verify',
          });
        }, 4000);
      } else if (returnCode === 401) {
        showToast('error', returnMessage);
      } else {
        showToast('error', returnMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return {
    email,
    setEmail,
    password,
    setPassword,
    errors,
    setErrors,
    loading,
    googleLoading,
    passwordVisible,
    setPasswordVisible,
    handleLogin,
    handleGoogleSignIn,
  };
}
