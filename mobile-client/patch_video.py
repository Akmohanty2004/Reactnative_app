import os
import re

files_info = [
    {
        'path': 'src/screens/student/DashboardScreen.js',
        'video_src': "require('../../../assets/student side video.mp4')",
        'old_video_block': """              <Video
                source={require('../../../assets/student side video.mp4')}
                style={{
                  position: 'absolute',
                  top: 12.5,
                  left: 8.3,
                  width: 83.4,
                  height: 58.4,
                  borderRadius: 6,
                }}
                resizeMode="cover"
                shouldPlay
                isLooping
                isMuted
              />""",
        'new_video_block': """              <VideoView
                player={player}
                style={{
                  position: 'absolute',
                  top: 12.5,
                  left: 8.3,
                  width: 83.4,
                  height: 58.4,
                  borderRadius: 6,
                }}
                contentFit="cover"
                nativeControls={false}
              />"""
    },
    {
        'path': 'src/screens/teacher/DashboardScreen.js',
        'video_src': "require('../../../assets/Teacher side video.mp4')",
        'old_video_block': """                  <Video
                    source={require('../../../assets/Teacher side video.mp4')}
                    style={{ width: '100%', height: '100%', borderRadius: 14 }}
                    resizeMode="cover"
                    shouldPlay
                    isLooping
                    isMuted
                  />""",
        'new_video_block': """                  <VideoView
                    player={player}
                    style={{ width: '100%', height: '100%', borderRadius: 14 }}
                    contentFit="cover"
                    nativeControls={false}
                  />"""
    },
    {
        'path': 'src/screens/admin/DashboardScreen.js',
        'video_src': "require('../../../assets/admin side video.mp4')",
        'old_video_block': """                  <Video
                    source={require('../../../assets/admin side video.mp4')}
                    style={{ width: '100%', height: '100%', borderRadius: 14 }}
                    resizeMode="cover"
                    shouldPlay
                    isLooping
                    isMuted
                  />""",
        'new_video_block': """                  <VideoView
                    player={player}
                    style={{ width: '100%', height: '100%', borderRadius: 14 }}
                    contentFit="cover"
                    nativeControls={false}
                  />"""
    }
]

for info in files_info:
    filepath = info['path']
    if not os.path.exists(filepath):
        print(f"Skipping {filepath}")
        continue
        
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Replace import
    if "import { Video } from 'expo-av';" in content:
        content = content.replace("import { Video } from 'expo-av';", "import { useVideoPlayer, VideoView } from 'expo-video';")
    
    # 2. Add player init
    func_decl = "export default function DashboardScreen() {"
    init_code = f"""
  const player = useVideoPlayer({info['video_src']}, player => {{
    player.loop = true;
    player.muted = true;
    player.play();
  }});"""
    
    if "useVideoPlayer(" not in content:
        content = content.replace(func_decl, func_decl + init_code)
        
    # 3. Replace Video component
    if info['old_video_block'] in content:
        content = content.replace(info['old_video_block'], info['new_video_block'])
    else:
        print(f"Warning: Could not find old video block in {filepath}")

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
        
    print(f"Successfully patched {filepath}")

