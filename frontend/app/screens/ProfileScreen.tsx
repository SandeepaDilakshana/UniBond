import { useEffect, useState } from "react";
import { supabase } from "../lib/supabse";
import { useAuth } from "../providers/AuthProvider";
import { SafeAreaView, FlatList, Modal } from "react-native";
import {
  TouchableOpacity,
  View,
  Text,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ShowingAvatar from "../Components/ShowingAvatar";
import { Link, router, useLocalSearchParams } from "expo-router";

export default function ProfileScreen() {
  const [fullname, setFullname] = useState("");
  const [username, setUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [contactNumber, setContactNumber] = useState("");
  const [gender, setGender] = useState("");
  const [dob, setDob] = useState(new Date());
  const [department, setDepartment] = useState("");
  const [faculty, setFaculty] = useState("");
  const [course, setCourse] = useState("");
  const [skills, setSkills] = useState("");
  const [interests, setInterests] = useState("");
  const [role, setRole] = useState<boolean>(false); // State for role
  const { userId } = useLocalSearchParams();
  const { session } = useAuth();
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [followingList, setFollowingList] = useState([]);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0); // State for following count
  const [postsCount, setPostsCount] = useState(0); // State for posts count
  const [posts, setPosts] = useState([]); // State for posts
  const [events, setEvents] = useState([]); // State for events
  const [dropdownVisible, setDropdownVisible] = useState(false); // State for dropdown visibility
  const [userEmail, setUserEmail] = useState(""); // State for user email

  useEffect(() => {
    if (userId || session) {
      getProfile();
      checkFollowingStatus();
      getFollowing();
      getFollowerCount();
      getFollowingCount(); // Fetch following count
      fetchPosts(); // Fetch posts and events
    }
  }, [userId, session]); // Only run when userId or session changes

  // Fetch posts and events created by the user
  const fetchPosts = async () => {
    try {
      const profileId = userId || session?.user?.id;
      if (!profileId) throw new Error("No user on the session!");

      // Reset posts, events, and postsCount before fetching
      setPosts([]);
      setEvents([]);
      setPostsCount(0);

      // Fetch posts
      const { data: postsData, error: postsError } = await supabase
        .from("posts")
        .select("id, content, likes, comments, is_public, user_id")
        .eq("user_id", profileId);

      if (postsData) {
        setPosts(postsData);
        setPostsCount((prevCount) => prevCount + postsData.length);
      }

      if (postsError) throw postsError;

      // Fetch events
      const { data: eventsData, error: eventsError } = await supabase
        .from("events")
        .select("id, event_name, event_description, event_location, event_date")
        .eq("uid", profileId);

      if (eventsData) {
        setEvents(eventsData); // Store events separately
        setPostsCount((prevCount) => prevCount + eventsData.length); // Update posts count
      }

      if (eventsError) throw eventsError;
    } catch (error) {
      console.error("Error fetching posts and events:", error);
      Alert.alert("Error", "Could not fetch posts or events.");
    }
  };

  // Fetching the follower count for the profile
  const getFollowerCount = async () => {
    try {
      const { data, error } = await supabase
        .from("followers")
        .select("follower_id")
        .eq("followed_id", userId);

      if (error) throw error;

      setFollowerCount(data.length);
    } catch (error) {
      console.error("Error fetching follower count:", error);
    }
  };

  // Fetching the following count for the profile
  const getFollowingCount = async () => {
    try {
      const { data, error } = await supabase
        .from("followers")
        .select("followed_id")
        .eq("follower_id", userId);

      if (error) throw error;

      setFollowingCount(data.length);
    } catch (error) {
      console.error("Error fetching following count:", error);
    }
  };

  // Check if the current user is following this profile
  const checkFollowingStatus = async () => {
    const profileId = session?.user?.id;
    const { data, error } = await supabase
      .from("followers")
      .select("follower_id")
      .eq("follower_id", profileId)
      .eq("followed_id", userId);

    if (error) {
      console.error("Error fetching following status:", error);
    } else {
      setIsFollowing(data.length > 0);
    }
  };

  // Fetching the list of followed users with their profile details
  const getFollowing = async () => {
    const profileId = session?.user?.id;
    const { data, error } = await supabase
      .from("followers")
      .select("followed_id, profiles(*)")
      .eq("follower_id", profileId);

    if (error) {
      console.error("Error fetching following list:", error);
    } else {
      setFollowingList(data);
    }
  };

  const toggleFollow = async (followedId) => {
    setLoading(true);
    try {
      const action = isFollowing ? unfollowUser : followUser;
      await action(followedId);
      setIsFollowing((prev) => !prev);
      getFollowing();
      getFollowerCount();
      if (!isFollowing) {
        fetchPosts(); // Fetch posts and events after following
      }
    } catch (error) {
      Alert.alert("Error", "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const followUser = async (followedId) => {
    const profileId = session?.user?.id;
    const { error } = await supabase
      .from("followers")
      .insert([{ follower_id: profileId, followed_id: followedId }]);

    if (error) throw new Error("Error following user.");
  };

  const unfollowUser = async (followedId) => {
    const profileId = session?.user?.id;
    const { error } = await supabase
      .from("followers")
      .delete()
      .eq("follower_id", profileId)
      .eq("followed_id", followedId);

    if (error) throw new Error("Error unfollowing user.");
  };

  // Fetching the profile data
  async function getProfile() {
    try {
      const profileId = userId || session?.user?.id;
      if (!profileId) throw new Error("No user on the session!");

      const { data, error } = await supabase
        .from("profiles")
        .select(
          `username, avatar_url, full_name, dob, contact_number, gender, department, faculty, course, skills, interests, role, email` // Add email to the select query
        )
        .eq("id", profileId)
        .single();

      if (error) throw error;

      if (data) {
        setUsername(data.username);
        setFullname(data.full_name);
        setAvatarUrl(data.avatar_url);
        setDob(new Date(data.dob));
        setContactNumber(data.contact_number);
        setGender(data.gender);
        setDepartment(data.department);
        setFaculty(data.faculty);
        setCourse(data.course);
        setSkills(data.skills);
        setInterests(data.interests);
        setRole(data.role);
        setUserEmail(data.email); // Set user email
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      Alert.alert("Error", "Unable to load profile data.");
    }
  }

  // Render a single post
  const renderPost = ({ item }) => (
    <View style={styles.postContainer}>
      <Text style={styles.postContent}>{item.content}</Text>
      <Text style={styles.postLikes}>Likes: {item.likes}</Text>
    </View>
  );

  // Render a single event
  const renderEvent = ({ item }) => (
    <View style={styles.eventContainer}>
      <Text style={styles.eventName}>{item.event_name}</Text>
      <Text style={styles.eventDescription}>{item.event_description}</Text>
      <Text style={styles.eventLocation}>Location: {item.event_location}</Text>
      <Text style={styles.eventDate}>Date: {item.event_date}</Text>
    </View>
  );

  // Key extractor for posts
  const postKeyExtractor = (item) => `post-${item.id}`;

  // Key extractor for events
  const eventKeyExtractor = (item) => `event-${item.id}`;

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={{ flexDirection: "row", justifyContent: "center" }}>
        <TouchableOpacity
          style={{ position: "absolute", left: 0, top: 20 }}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
      </View>

      <View
        style={{
          alignItems: "flex-start",
          marginTop: 40,
          marginHorizontal: 20,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <ShowingAvatar
            url={avatarUrl}
            size={150}
            onUpload={(newAvatarUrl) => setAvatarUrl(newAvatarUrl)}
          />
          {/* Display Followers, Following, and Posts Count */}
          <View style={{ flexDirection: "row", marginTop: 10 }}>
            <View style={{ alignItems: "center", marginHorizontal: 5 }}>
              <Text style={{ fontSize: 16, fontWeight: "bold" }}>
                {postsCount}
              </Text>
              <Text style={{ fontSize: 14, color: "#666" }}>Posts</Text>
            </View>

            <Text style={{ fontSize: 20, color: "#666", marginHorizontal: 5 }}>
              |
            </Text>

            <View style={{ alignItems: "center", marginHorizontal: 5 }}>
              <Text style={{ fontSize: 16, fontWeight: "bold" }}>
                {followerCount}
              </Text>
              <Text style={{ fontSize: 14, color: "#666" }}>Followers</Text>
            </View>

            <Text style={{ fontSize: 20, color: "#666", marginHorizontal: 5 }}>
              |
            </Text>

            <View style={{ alignItems: "center", marginHorizontal: 5 }}>
              <Text style={{ fontSize: 16, fontWeight: "bold" }}>
                {followingCount}
              </Text>
              <Text style={{ fontSize: 14, color: "#666" }}>Following</Text>
            </View>
          </View>
        </View>
        <Text style={{ fontSize: 20, fontWeight: "bold" }}>
          {fullname || "Profile"} {role ? "(Alumni)" : "(Student)"}
        </Text>
        <Text style={{ fontSize: 16, color: "#555" }}>
          {username} | {contactNumber}
        </Text>
        <Text style={{ fontSize: 16, color: "#555" }}>
          {faculty} | {department}
        </Text>
        <Text style={{ fontSize: 16, marginTop: 10 }}>{skills}</Text>
      </View>

      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginHorizontal: 20,
          marginTop: 20,
        }}
      >
        {userId !== session?.user?.id && (
          <TouchableOpacity
            onPress={() => toggleFollow(userId)}
            disabled={loading}
            style={{
              backgroundColor: isFollowing ? "#FF3B30" : "#2C3036",
              padding: 10,
              borderRadius: 25,
              flex: 1,
              alignItems: "center",
            }}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={{ color: "#fff" }}>
                {isFollowing ? "Unfollow" : "Follow"}
              </Text>
            )}
          </TouchableOpacity>
        )}

        {!userId && (
          <TouchableOpacity
            onPress={() => router.push("/screens/DetailsForStudents")}
            style={{
              backgroundColor: "#2C3036",
              padding: 10,
              borderRadius: 25,
              flex: 1,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#fff" }}>Edit</Text>
          </TouchableOpacity>
        )}

        {userId !== session?.user?.id && isFollowing && (
          <>
            <TouchableOpacity
              style={{
                backgroundColor: "#2C3036",
                padding: 10,
                borderRadius: 25,
                flex: 1,
                marginLeft: 10,
                alignItems: "center",
              }}
            >
              <Link href={`../user?userId=${userId}`} asChild>
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={{ color: "#fff" }}>Message</Text>
                )}
              </Link>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setDropdownVisible(true)}
              style={{ marginLeft: 10 }}
            >
              <Ionicons name="ellipsis-vertical" size={24} color="black" />
            </TouchableOpacity>
          </>
        )}

        {!userId && (
          <TouchableOpacity
            onPress={async () => {
              try {
                const { error } = await supabase.auth.signOut();
                if (error) throw error;
                router.push("../(auth)/login");
              } catch (error) {
                if (error instanceof Error) {
                  Alert.alert("Error", error.message);
                }
              }
            }}
            style={{
              borderWidth: 2,
              borderColor: "#2C3036",
              backgroundColor: "transparent",
              padding: 10,
              borderRadius: 40,
              flex: 1,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#2C3036" }}>Sign Out</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Conditionally render posts and events only if following */}
      {isFollowing && (
        <>
          {/* Posts Section */}
          <View style={{ marginTop: 10, marginHorizontal: 20, flex: 1 }}>
            <Text style={{ fontSize: 18, fontWeight: "bold" }}>Posts</Text>
            <FlatList
              data={posts}
              renderItem={renderPost}
              keyExtractor={postKeyExtractor} // Use unique key extractor
              ListEmptyComponent={
                <Text style={{ textAlign: "center", marginTop: 10 }}>
                  No posts found.
                </Text>
              }
            />
          </View>

          {/* Events Section */}
          <View style={{ marginTop: 10, marginHorizontal: 20, flex: 1 }}>
            <Text style={{ fontSize: 18, fontWeight: "bold" }}>Events</Text>
            <FlatList
              data={events}
              renderItem={renderEvent}
              keyExtractor={eventKeyExtractor} // Use unique key extractor
              ListEmptyComponent={
                <Text style={{ textAlign: "center", marginTop: 10 }}>
                  No events found.
                </Text>
              }
            />
          </View>
        </>
      )}

      {/* Dropdown Modal */}
      <Modal
        transparent={true}
        visible={dropdownVisible}
        onRequestClose={() => setDropdownVisible(false)}
      >
        <View style={styles.dropdownContainer}>
          <View style={styles.dropdownMenu}>
            <Text style={styles.dropdownItem}>Contact: {contactNumber}</Text>
            <Text style={styles.dropdownItem}>Email: {userEmail}</Text>
            <TouchableOpacity
              onPress={() => setDropdownVisible(false)}
              style={styles.closeButton}
            >
              <Text style={{ color: "#2C3036" }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  postContainer: {
    padding: 15,
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    marginBottom: 10,
  },
  postContent: {
    fontSize: 16,
  },
  postLikes: {
    fontSize: 14,
    color: "#666",
    marginTop: 5,
  },
  eventContainer: {
    padding: 15,
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    marginBottom: 10,
  },
  eventName: {
    fontSize: 18,
    fontWeight: "bold",
  },
  eventDescription: {
    fontSize: 16,
    marginTop: 5,
  },
  eventLocation: {
    fontSize: 14,
    color: "#666",
    marginTop: 5,
  },
  eventDate: {
    fontSize: 14,
    color: "#666",
    marginTop: 5,
  },
  dropdownContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  dropdownMenu: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 20,
    width: 250,
  },
  dropdownItem: {
    fontSize: 16,
    marginBottom: 10,
  },
  closeButton: {
    marginTop: 10,
    alignItems: "center",
  },
});
