import { Audio } from 'expo-av';

export const playRefreshSound = async () => {
  try {
    const { sound } = await Audio.Sound.createAsync(
      require('../../assets/student_refresh.mp3')
    );
    await sound.playAsync();
    
    // Unload the sound from memory after it finishes playing
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.didJustFinish) {
        sound.unloadAsync();
      }
    });
  } catch (error) {
    console.log("Failed to play refresh sound", error);
  }
};

export const playTeacherRefreshSound = async () => {
  try {
    const { sound } = await Audio.Sound.createAsync(
      { uri: 'https://assets.mixkit.co/active_storage/sfx/2574/2574-preview.mp3' }
    );
    await sound.playAsync();
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.didJustFinish) sound.unloadAsync();
    });
  } catch (error) {
    console.log("Failed to play teacher refresh sound", error);
  }
};

export const playLikeSound = async () => {
  try {
    const { sound } = await Audio.Sound.createAsync(
      require('../../assets/like_new.mp3')
    );
    await sound.playAsync();
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.didJustFinish) sound.unloadAsync();
    });
  } catch (error) {
    console.log("Failed to play like sound", error);
  }
};

export const playHomeChime = async () => {
  try {
    const { sound } = await Audio.Sound.createAsync(
      require('../../assets/chime.wav')
    );
    await sound.playAsync();
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.didJustFinish) sound.unloadAsync();
    });
  } catch (error) {
    console.log('Failed to play home chime', error);
  }
};