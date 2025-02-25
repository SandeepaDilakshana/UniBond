import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { FontAwesome, MaterialIcons } from "@expo/vector-icons";
import ShowingAvatar from "./ShowingAvatar";
import { supabase } from "../lib/supabse";
import { useAuth } from "../providers/AuthProvider";
import { Image } from "react-native";

interface TopNavigationBarProps {
  userName: string;
  onProfilePress?: () => void;
  onNotificationPress?: () => void;
  onPostPress?: () => void;
}

const TopNavigationBar: React.FC<TopNavigationBarProps> = ({
  userName,
  onProfilePress,
  onNotificationPress,
  onPostPress,
}) => {
  const { session } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const { profile } = useAuth();
  useEffect(() => {
    if (session) getProfile();
  }, [session]);
  const storageUrl =
    "https://jnqvgrycauzjnvepqorq.supabase.co/storage/v1/object/public/avatars/";
  const imageUrl = profile.avatar_url
    ? `${storageUrl}${profile.avatar_url}`
    : null;

  async function getProfile() {
    try {
      const profileId = session?.user?.id;
      if (!profileId) throw new Error("No user on the session!");

      const { data, error } = await supabase
        .from("profiles")
        .select(`avatar_url`)
        .eq("id", profileId)
        .single();

      if (data) {
        setAvatarUrl(data.avatar_url);
      }

      if (error) throw error;
    } catch (error) {
      console.error("Error fetching profile:", error);
      if (error instanceof Error) Alert.alert("Error", error.message);
    }
  }

  return (
    <View style={styles.container}>
      {/* Profile Icon */}
      <TouchableOpacity onPress={onProfilePress}>
        <View style={styles.profileImage}>
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              style={{ width: 40, height: 40, borderRadius: 20 }}
            />
          ) : (
            <MaterialIcons name="person" size={40} color="#fff" />
          )}
        </View>
      </TouchableOpacity>

      {/* User Name */}
      <Text style={styles.userName}>{userName}</Text>

      {/* Notification and Post Icons */}
      <View style={styles.iconContainer}>
        <TouchableOpacity onPress={onNotificationPress} style={styles.icon}>
          <MaterialIcons name="notifications" size={24} color="#000" />
        </TouchableOpacity>
        <TouchableOpacity onPress={onPostPress} style={styles.icon}>
          <MaterialIcons name="add-circle" size={24} color="#000" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
  },
  profileImage: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#ccc",
    justifyContent: "center",
    alignItems: "center",
  },
  userName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
  },
  iconContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  icon: {
    marginLeft: 15,
  },
});

export default TopNavigationBar;
