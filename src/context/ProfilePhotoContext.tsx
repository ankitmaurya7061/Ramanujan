import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";

import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

import { useAuth } from "./AuthContext";

type ProfilePhotoContextType = {
  photo: string | null;
  pickPhoto: () => Promise<void>;
  removePhoto: () => Promise<void>;
};

const ProfilePhotoContext =
  createContext<ProfilePhotoContextType | undefined>(
    undefined
  );

const API_BASE_URL =
  "http://192.168.31.222:5000/api";

export function ProfilePhotoProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { user } = useAuth();

  const [photo, setPhoto] =
    useState<string | null>(null);

  const getToken = async () => {
    try {
      const AsyncStorage =
        require(
          "@react-native-async-storage/async-storage"
        ).default;

      return await AsyncStorage.getItem(
        "studypoint_token"
      );
    } catch {
      return null;
    }
  };

  const loadPhoto = async () => {
    try {
      if (!user) {
        setPhoto(null);
        return;
      }

      const token = await getToken();

      if (!token) {
        setPhoto(null);
        return;
      }

      const response = await fetch(
        `${API_BASE_URL}/users/me`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            "Failed to load profile photo"
        );
      }

      setPhoto(
        data.user?.profilePhoto || null
      );
    } catch (error) {
      console.log(
        "Load profile photo error:",
        error
      );
    }
  };

  useEffect(() => {
    loadPhoto();
  }, [user?.email]);

  const pickPhoto = async () => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        alert(
          "Please allow photo library permission."
        );
        return;
      }

      const result =
        await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });

      if (
        result.canceled ||
        !result.assets ||
        result.assets.length === 0
      ) {
        return;
      }

      const asset = result.assets[0];

      const token = await getToken();

      if (!token) {
        alert(
          "Please login again to update your profile photo."
        );
        return;
      }

      const response =
        await FileSystem.uploadAsync(
          `${API_BASE_URL}/users/profile-photo`,
          asset.uri,
          {
            httpMethod: "PUT",

            uploadType:
              FileSystem.FileSystemUploadType
                .MULTIPART,

            fieldName: "profilePhoto",

            mimeType:
              asset.mimeType ||
              "image/jpeg",

            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

      let data: any = null;

      try {
        data = JSON.parse(response.body);
      } catch {
        data = null;
      }

      if (
        response.status < 200 ||
        response.status >= 300
      ) {
        throw new Error(
          data?.message ||
            `Upload failed with status ${response.status}`
        );
      }

      if (!data?.success) {
        throw new Error(
          data?.message ||
            "Profile photo upload failed"
        );
      }

      if (data.user?.profilePhoto) {
        setPhoto(
          data.user.profilePhoto
        );
      } else {
        await loadPhoto();
      }
    } catch (error) {
      console.log(
        "Pick profile photo error:",
        error
      );

      alert(
        "Unable to update profile photo. Please try again."
      );
    }
  };

  const removePhoto = async () => {
    try {
      const token = await getToken();

      if (!token) {
        return;
      }

      const response = await fetch(
        `${API_BASE_URL}/users/profile-photo`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            "Failed to remove profile photo"
        );
      }

      setPhoto(null);
    } catch (error) {
      console.log(
        "Remove profile photo error:",
        error
      );

      alert(
        "Unable to remove profile photo. Please try again."
      );
    }
  };

  return (
    <ProfilePhotoContext.Provider
      value={{
        photo,
        pickPhoto,
        removePhoto,
      }}
    >
      {children}
    </ProfilePhotoContext.Provider>
  );
}

export function useProfilePhoto() {
  const context = useContext(
    ProfilePhotoContext
  );

  if (!context) {
    throw new Error(
      "useProfilePhoto must be used inside ProfilePhotoProvider"
    );
  }

  return context;
} 
