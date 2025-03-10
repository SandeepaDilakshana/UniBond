import React, { useEffect, useState } from "react";
import {
  View,
  Alert,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Text,
  TouchableOpacity,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/app/providers/AuthProvider";
import TopNavigationBar from "../../Components/TopNavigationBar";
import { supabase } from "../../../lib/supabse";
import PostItem from "../../screens/PostItem";
import { MaterialIcons } from "@expo/vector-icons";
import RandomUserCards from "@/app/Components/renderUserCard ";
import { SafeAreaView } from "react-native-safe-area-context";

type Post = {
  id: number;
  content: string;
  likes: number;
  comments: { username: string; comment: string }[];
  is_public: boolean;
  user_id: string;
  username: string;
  posted_date: string;
  avatar_url: string;
  role: boolean;
};

type Event = {
  id: number;
  event_name: string;
  event_date: string;
  event_location: string;
  event_description: string;
  user_id: string;
  username: string;
  posted_date: string;
  avatar_url: string;
  role: boolean;
  interested_count: number;
  isInterestedByCurrentUser: boolean;
};

const HomeScreen: React.FC = () => {
  const router = useRouter();
  const { session } = useAuth();
  const [username, setUsername] = useState<string>("");
  const [combinedData, setCombinedData] = useState<(Post | Event)[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [filter, setFilter] = useState<"all" | "posts" | "events">("all");
  const [sortBy, setSortBy] = useState<"date" | "likes" | "interested">("date");
  const [isDateSorted, setIsDateSorted] = useState<boolean>(false);

  useEffect(() => {
    if (session) {
      getProfile();
      fetchCombinedData();
    }
  }, [session]);

  const getProfile = async () => {
    try {
      const profileId = session?.user?.id;
      if (!profileId) throw new Error("No user on the session!");

      const { data, error } = await supabase
        .from("profiles")
        .select("username, avatar_url, role")
        .eq("id", profileId)
        .single();

      if (error) throw error;
      setUsername(data.username || "Anonymous");
    } catch (error) {
      console.error("Error fetching profile:", error);
      Alert.alert("Error", "Could not fetch user profile.");
    }
  };

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("username, avatar_url, role")
        .eq("id", userId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error fetching user profile:", error);
      return { username: "Anonymous", avatar_url: null, role: false };
    }
  };

  const fetchCombinedData = async () => {
    setLoading(true);
    try {
      // Fetch posts
      const { data: postsData, error: postsError } = await supabase
        .from("posts")
        .select("id, content, likes, comments, is_public, user_id, created_at")
        .or(`is_public.eq.true,user_id.eq.${session?.user?.id}`);

      if (postsError) throw postsError;

      // Fetch events
      const { data: eventsData, error: eventsError } = await supabase
        .from("events")
        .select(
          "id, event_name, event_date, event_location, event_description, uid, created_at, interested_count"
        );

      if (eventsError) throw eventsError;

      // Fetch user profile data for each post
      const postsWithUserData = await Promise.all(
        postsData.map(async (post: Post) => {
          const userProfile = await fetchUserProfile(post.user_id);
          return {
            ...post,
            type: "post",
            username: userProfile.username,
            avatar_url: userProfile.avatar_url,
            role: userProfile.role,
            posted_date: new Date(post.created_at).toISOString(),
          };
        })
      );

      // Fetch user profile data and interest status for each event
      const eventsWithUserData = await Promise.all(
        eventsData.map(async (event: Event) => {
          const userProfile = await fetchUserProfile(event.uid);

          // Check if the current user is interested in this event
          const { data: interestData, error: interestError } = await supabase
            .from("event_interests")
            .select("*")
            .eq("event_id", event.id)
            .eq("user_id", session?.user?.id);

          if (interestError) throw interestError;

          const isInterestedByCurrentUser = interestData.length > 0;

          return {
            ...event,
            type: "event",
            username: userProfile.username,
            avatar_url: userProfile.avatar_url,
            role: userProfile.role,
            posted_date: new Date(event.created_at).toISOString(),
            isInterestedByCurrentUser,
          };
        })
      );

      setCombinedData([...eventsWithUserData, ...postsWithUserData]);
    } catch (error) {
      console.error("Error fetching data:", error);
      Alert.alert("Error", "Could not fetch data.");
    } finally {
      setLoading(false);
    }
  };

  const calculatePostDuration = (postedDate: string) => {
    const postDate = new Date(postedDate);
    const currentDate = new Date();
    const timeDifference = currentDate.getTime() - postDate.getTime();

    const daysDifference = Math.floor(timeDifference / (1000 * 3600 * 24));
    const hoursDifference = Math.floor(timeDifference / (1000 * 3600));
    const minutesDifference = Math.floor(timeDifference / (1000 * 60));

    if (daysDifference > 0) {
      return `${daysDifference} day${daysDifference > 1 ? "s" : ""} ago`;
    } else if (hoursDifference > 0) {
      return `${hoursDifference} hour${hoursDifference > 1 ? "s" : ""} ago`;
    } else if (minutesDifference > 0) {
      return `${minutesDifference} minute${minutesDifference > 1 ? "s" : ""} ago`;
    } else {
      return "Just now";
    }
  };

  const handleLike = async (postId: number) => {
    try {
      const post = combinedData.find(
        (item) => item.type === "post" && item.id === postId
      ) as Post;

      if (!post) throw new Error("Post not found");

      const isLiked = post.likes > 0;
      const newLikes = isLiked ? post.likes - 1 : post.likes + 1;

      const { error } = await supabase
        .from("posts")
        .update({ likes: newLikes })
        .eq("id", postId);

      if (error) throw error;

      setCombinedData((prev) =>
        prev.map((item) =>
          item.type === "post" && item.id === postId
            ? { ...item, likes: newLikes }
            : item
        )
      );
    } catch (error) {
      console.error("Error toggling like:", error);
      Alert.alert("Error", "Could not toggle like.");
    }
  };

  const handleCommentSubmit = async (postId: number, newComment: string) => {
    try {
      setCombinedData((prev) =>
        prev.map((item) =>
          item.type === "post" && item.id === postId
            ? {
                ...item,
                comments: [...item.comments, { username, comment: newComment }],
              }
            : item
        )
      );

      const { error } = await supabase
        .from("posts")
        .update({
          comments: [
            ...(combinedData.find((p) => p.id === postId) as Post).comments,
            { username, comment: newComment },
          ],
        })
        .eq("id", postId);

      if (error) throw error;
    } catch (error) {
      console.error("Error adding comment:", error);
      Alert.alert("Error", "Could not add the comment.");
    }
  };

  const handleInterestToggle = async (eventId: number) => {
    try {
      const event = combinedData.find(
        (item) => item.type === "event" && item.id === eventId
      ) as Event;

      if (!event) throw new Error("Event not found");

      const isInterested = event.isInterestedByCurrentUser;

      if (isInterested) {
        const { error: removeError } = await supabase
          .from("event_interests")
          .delete()
          .eq("event_id", eventId)
          .eq("user_id", session?.user?.id);

        if (removeError) throw removeError;

        const newInterestedCount = event.interested_count - 1;

        const { error: updateError } = await supabase
          .from("events")
          .update({ interested_count: newInterestedCount })
          .eq("id", eventId);

        if (updateError) throw updateError;

        setCombinedData((prev) =>
          prev.map((item) =>
            item.type === "event" && item.id === eventId
              ? {
                  ...item,
                  interested_count: newInterestedCount,
                  isInterestedByCurrentUser: false,
                }
              : item
          )
        );
      } else {
        const { error: addError } = await supabase
          .from("event_interests")
          .insert([{ event_id: eventId, user_id: session?.user?.id }]);

        if (addError) throw addError;

        const newInterestedCount = event.interested_count + 1;

        const { error: updateError } = await supabase
          .from("events")
          .update({ interested_count: newInterestedCount })
          .eq("id", eventId);

        if (updateError) throw updateError;

        setCombinedData((prev) =>
          prev.map((item) =>
            item.type === "event" && item.id === eventId
              ? {
                  ...item,
                  interested_count: newInterestedCount,
                  isInterestedByCurrentUser: true,
                }
              : item
          )
        );
      }
    } catch (error) {
      console.error("Error toggling interest:", error);
      Alert.alert("Error", "Could not toggle interest.");
    }
  };

  const handleFilterChange = (newFilter: "all" | "posts" | "events") => {
    setFilter(newFilter);
  };

  const handleSortChange = (newSort: "date" | "likes" | "interested") => {
    if (newSort === "date") {
      setIsDateSorted((prev) => !prev);
      setSortBy("date");
    } else {
      setIsDateSorted(false);
      setSortBy(newSort);
    }
  };

  const filteredData = combinedData.filter((item) => {
    if (filter === "posts") return item.type === "post";
    if (filter === "events") return item.type === "event";
    return true; // 'all'
  });

  const sortedData = filteredData.sort((a, b) => {
    if (sortBy === "date" && isDateSorted) {
      return (
        new Date(b.posted_date).getTime() - new Date(a.posted_date).getTime()
      );
    } else if (sortBy === "likes" && a.type === "post" && b.type === "post") {
      return b.likes - a.likes;
    } else if (
      sortBy === "interested" &&
      a.type === "event" &&
      b.type === "event"
    ) {
      return b.interested_count - a.interested_count;
    }
    return 0; // No sorting
  });

  const renderItem = ({ item }: { item: Post | Event }) => {
    if (item.type === "event") {
      const event = item as Event;
      const storageUrl =
        "https://jnqvgrycauzjnvepqorq.supabase.co/storage/v1/object/public/avatars/";
      const imageUrl = event.avatar_url
        ? `${storageUrl}${event.avatar_url}`
        : null;

      return (
        <View style={styles.eventItem}>
          <TouchableOpacity
            onPress={() =>
              router.push(`/screens/ProfileScreen?userId=${event.uid}`)
            }
          >
            <View style={styles.userInfoContainer}>
              {imageUrl ? (
                <Image
                  source={{ uri: imageUrl }}
                  style={{ width: 40, height: 40, borderRadius: 20 }}
                />
              ) : (
                <MaterialIcons name="person" size={40} color="#000" />
              )}
              <View style={styles.userInfoText}>
                <Text style={styles.username}>
                  {event.username} ({event.role ? "Alumni" : "Student"})
                </Text>
                <Text style={styles.postedDate}>
                  {calculatePostDuration(event.posted_date)}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
          <Text style={styles.eventTitle}>{event.event_name}</Text>
          <Text style={styles.eventDetails}>Date: {event.event_date}</Text>
          <Text style={styles.eventDetails}>
            Location: {event.event_location}
          </Text>
          <Text style={styles.eventDetails}>
            Description: {event.event_description}
          </Text>
          <Text style={styles.eventDetails}>
            Interested People: ({event.interested_count})
          </Text>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.interestedButton}
            onPress={() => handleInterestToggle(event.id)}
          >
            <MaterialIcons
              name={event.isInterestedByCurrentUser ? "remove" : "add"}
              size={20}
              color="#000"
            />
            <Text style={styles.interestedButtonText}>
              {event.isInterestedByCurrentUser
                ? "Not Interested"
                : "Interested"}
            </Text>
          </TouchableOpacity>
        </View>
      );
    } else if (item.type === "post") {
      const post = item as Post;
      const storageUrl =
        "https://jnqvgrycauzjnvepqorq.supabase.co/storage/v1/object/public/avatars/";
      const imageUrl = post.avatar_url
        ? `${storageUrl}${post.avatar_url}`
        : null;

      return (
        <PostItem
          post={post}
          username={post.username}
          avatarUrl={imageUrl}
          postedDate={post.posted_date}
          postDuration={calculatePostDuration(post.posted_date)}
          role={post.role}
          onLike={handleLike}
          onCommentSubmit={handleCommentSubmit}
          onProfilePress={() =>
            router.push(`/screens/ProfileScreen?userId=${post.user_id}`)
          }
        />
      );
    }
    return null;
  };

  const renderHeader = () => (
    <View style={styles.randomUserCardsContainer}>
      <RandomUserCards currentUserId={session?.user?.id} />
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <>
      <SafeAreaView>
        <TopNavigationBar
          userName={username}
          onProfilePress={() => router.push("/screens/ShowProfileEdit")}
          onNotificationPress={() => router.push("/screens/NotificationScreen")}
          onPostPress={() => router.push("/screens/PostScreen")}
        />

        <View style={styles.filterSortContainer}>
          <TouchableOpacity
            style={[
              styles.filterButton,
              filter === "all" && styles.activeFilter,
            ]}
            onPress={() => handleFilterChange("all")}
          >
            <Text style={styles.filterButtonText}>All</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterButton,
              filter === "posts" && styles.activeFilter,
            ]}
            onPress={() => handleFilterChange("posts")}
          >
            <Text style={styles.filterButtonText}>Posts</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterButton,
              filter === "events" && styles.activeFilter,
            ]}
            onPress={() => handleFilterChange("events")}
          >
            <Text style={styles.filterButtonText}>Events</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.sortButton, isDateSorted && styles.activeSort]}
            onPress={() => handleSortChange("date")}
          >
            <Text style={styles.sortButtonText}>
              {isDateSorted ? "Remove Sort by Date" : "Sort by Date"}
            </Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={sortedData}
          renderItem={renderItem}
          keyExtractor={(item) =>
            `${item.type === "event" ? "event" : "post"}-${item.id}`
          }
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderHeader}
          contentContainerStyle={styles.combinedList}
        />

        <TouchableOpacity
          style={styles.DonateButton}
          onPress={() => {
            router.push("/screens/DonationScreen");
          }}
        >
          <Image source={require("../../Constatnts/Donate Icon.png")} />
          <Text style={{ color: "#000", fontWeight: "bold" }}>Donate</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  DonateButton: {
    borderWidth: 1,
    borderColor: "#EBF2FA",
    alignItems: "center",
    justifyContent: "center",
    width: 70,
    position: "absolute",
    top: 600,
    right: 20,
    height: 70,
    backgroundColor: "#EBF2FA",
    borderRadius: 100,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  combinedList: {
    padding: 16,
  },
  eventItem: {
    marginBottom: 16,
    padding: 16,
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: "bold",
  },
  eventDetails: {
    fontSize: 14,
    color: "#555",
    marginTop: 4,
  },
  userInfoContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  userInfoText: {
    flexDirection: "column",
  },
  username: {
    fontSize: 14,
    fontWeight: "bold",
    marginRight: 10,
    marginLeft: 10,
  },
  postedDate: {
    fontSize: 12,
    color: "#666",
    marginRight: 10,
    marginLeft: 10,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  interestedButton: {
    marginTop: 5,
    padding: 10,
    backgroundColor: "Transaprent",
    borderRadius: 5,
    alignItems: "center",
  },
  interestedButtonText: {
    color: "#000",
    fontWeight: "bold",
  },
  divider: {
    height: 1,
    backgroundColor: "#2C3036",
    marginVertical: 5,
  },
  filterSortContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-around",
    padding: 10,
    backgroundColor: "#fff",
  },
  filterButton: {
    padding: 10,
    borderRadius: 10,
    backgroundColor: "#ddd",
    margin: 5,
  },
  activeFilter: {
    backgroundColor: "#2C3036",
  },
  filterButtonText: {
    color: "#fff",
  },
  sortButton: {
    padding: 10,
    borderRadius: 10,
    backgroundColor: "#ddd",
    margin: 5,
    marginRight: 20,
  },
  activeSort: {
    backgroundColor: "#2C3036",
  },
  sortButtonText: {
    color: "#FFF",
  },
  randomUserCardsContainer: {
    padding: 10,
    marginBottom: 10,
  },
});

export default HomeScreen;
