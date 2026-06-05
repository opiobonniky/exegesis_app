import { sendPostRequest } from "../services/api";


export const useTranslation = async (text: string) => {
    if (!text) {
        console.warn("No text provided for translation.");
        return "";
    }
   try {
    const response:any = await sendPostRequest("translations", "translate-text", { text });
    return response.data;
  } catch (error) {
    console.error("Translation error:", error);
    throw error;
  }
}