
import re
import json
import os

song_style_map = {'f': 'flac', 'm': 'mp3'}

def parse_txt_to_json(txt_content, existing_data=None):
    data = existing_data if existing_data else []
    current_year = None
    current_section = None
    current_album = None
    current_song = None
    current_cover = None
    lyrics_buffer = []
    current_song_style = None
    current_singer=None
    new_flag = False
    album_none_flag=False
    single_none_flag=False
    others_none_flag=False


    lines = txt_content.split('\n')

    for i, line in enumerate(lines):
        line = line.strip()
        if not line:
            continue

        # 解析年份
        if re.match(r'^\d{4}$', line):
            current_year = line
            # 检查是否已存在该年份的数据
            year_entry = next((item for item in data if item["year"] == current_year), None)
            if not year_entry:
                data.append({
                    "year": current_year,
                    "branches": []
                })
            continue

        # 解析分支类型
        if line in ["专辑", "个人单曲", "为他人创作"]:
            none_flag=False
            if line in ["个人单曲", "为他人创作"]:
                new_flag = True
            current_section = line
            branch_type = "album" if line == "专辑" else "single" if line == "个人单曲" else "composition"

            # 获取当前年份的条目
            year_entry = next((item for item in data if item["year"] == current_year), None)
            if not year_entry:
                continue

            # 检查是否已存在该分支
            existing_branch = next((b for b in year_entry["branches"] if b["title"] == line), None)
            if not existing_branch:
                if branch_type == "album":
                    new_branch = {
                        "title": line,
                        "type": branch_type,
                        "data": {
                            "title": "",
                            "releaseDate": "",
                            "cover": f"assets/images/",
                            "songs": []
                        }
                    }
                else:
                    new_branch = {
                        "title": line,
                        "type": branch_type,
                        "data": {
                            "songs": []
                        }
                    }
                year_entry["branches"].append(new_branch)

            continue

        # 处理专辑信息
        if current_section == "专辑":
            year_entry = next((item for item in data if item["year"] == current_year), None)
            if not year_entry:
                continue

            album_branch = next((b for b in year_entry["branches"] if b["title"] == "专辑"), None)
            if not album_branch:
                continue

            # 获取专辑标题和日期和封面
            if not album_branch["data"]["title"]:
                if lines[i] == '无':
                    album_none_flag = True

                if album_none_flag == False:
                    album_branch["data"]["title"] = lines[i]
                    if i + 1 < len(lines):
                        album_branch["data"]["releaseDate"] = lines[i + 1].strip()
                    current_cover=lines[i + 2].strip()
                    album_branch["data"]["cover"] = album_branch["data"]["cover"]+f"{current_cover}"
                    continue
            if(album_none_flag==False):
                # 解析歌曲
                song_header = re.match(r'^(\d+)\s+(\d+:\d+)\s+([a-zA-Z])$', line)
                if song_header:
                    if current_song:  # 保存前一首歌
                        current_song["lyrics"] = "\n".join(lyrics_buffer)
                        album_branch["data"]["songs"].append(current_song)
                        lyrics_buffer = []

                    # 创建新歌曲
                    song_number = song_header.group(1)
                    song_duration = song_header.group(2)
                    current_song_style = song_style_map.get(song_header.group(3), 'mp3')
                    song_title = lines[i + 1].split(" - ")[0].strip() if i + 1 < len(lines) else "Unknown"
                    current_singer=lines[i + 1].split(" - ")[1].strip()

                    current_song = {
                        "number": song_number,
                        "title": song_title,
                        "duration": song_duration,
                        "lyrics": [],
                        "singer": current_singer,
                        "file": f'DT_{current_year}/{song_title}.{current_song_style}'
                    }
                    continue

                # 收集歌词
                if current_song and not song_header:
                    lyrics_buffer.append(line)

        # 处理个人单曲
        elif current_section == "个人单曲":
            if (new_flag and album_none_flag==False):
                if current_song and lyrics_buffer:
                    current_song["lyrics"] = "\n".join(lyrics_buffer)
                    album_branch["data"]["songs"].append(current_song)
                new_flag = False
                current_song = None
                lyrics_buffer = []

            year_entry = next((item for item in data if item["year"] == current_year), None)
            if not year_entry:
                continue

            single_branch = next((b for b in year_entry["branches"] if b["title"] == "个人单曲"), None)
            if not single_branch:
                continue

            # 解析歌曲
            if(line=='无'):
              single_none_flag=True
            if(single_none_flag==False):
                song_header = re.match(r'^(\d+)\s+(\d+:\d+)\s+([a-zA-Z])$', line)

                if song_header:
                    if current_song:  # 保存前一首歌
                        current_song["lyrics"] = "\n".join(lyrics_buffer)
                        single_branch["data"]["songs"].append(current_song)
                        lyrics_buffer = []

                    # 创建新歌曲
                    song_number = song_header.group(1)
                    song_duration = song_header.group(2)
                    current_song_style = song_style_map.get(song_header.group(3), 'mp3')
                    song_title = lines[i + 1].split(" - ")[0].strip() if i + 1 < len(lines) else "Unknown"
                    current_singer = lines[i + 1].split(" - ")[1].strip()


                    current_song = {
                        "number": song_number,
                        "title": song_title,
                        "duration": song_duration,
                        "lyrics": [],
                        'singer': current_singer,
                        "file": f'DT_{current_year}/{song_title}.{current_song_style}'
                    }
                    continue

                # 收集歌词
                if current_song and not song_header:
                    lyrics_buffer.append(line)

        # 处理为他人创作
        elif current_section == "为他人创作":
            if (new_flag and single_none_flag==False):
                if current_song and lyrics_buffer:
                    current_song["lyrics"] = "\n".join(lyrics_buffer)
                    single_branch["data"]["songs"].append(current_song)
                    new_flag = False
                    current_song = None
                    lyrics_buffer = []

            year_entry = next((item for item in data if item["year"] == current_year), None)
            if not year_entry:
                continue

            others_branch = next((b for b in year_entry["branches"] if b["title"] == "为他人创作"), None)
            if not others_branch:
                continue

            if(line=='无'):
                others_none_flag=True
            if(others_none_flag==False):
                # 解析歌曲
                song_header = re.match(r'^(\d+)\s+(\d+:\d+)\s+([a-zA-Z])$', line)

                if song_header:
                    if current_song:  # 保存前一首歌
                        current_song["lyrics"] = "\n".join(lyrics_buffer)
                        others_branch["data"]["songs"].append(current_song)
                        lyrics_buffer = []

                    # 创建新歌曲
                    song_number = song_header.group(1)
                    song_duration = song_header.group(2)
                    current_song_style = song_style_map.get(song_header.group(3), 'mp3')
                    current_singer = lines[i + 1].split(" - ")[1].strip()
                    song_title = lines[i + 1].split(" - ")[0].strip() if i + 1 < len(lines) else "Unknown"

                    current_song = {
                        "number": song_number,
                        "title": song_title,
                        "duration": song_duration,
                        "lyrics": [],
                        'singer': current_singer,
                        "file": f'DT_{current_year}/{song_title}.{current_song_style}'
                    }
                    continue

                # 收集歌词
                if current_song and not song_header:
                    lyrics_buffer.append(line)

    # 处理最后一首歌曲
    if(others_none_flag==False):
       if current_song and lyrics_buffer:
            current_song["lyrics"] = "\n".join(lyrics_buffer)
            others_branch["data"]["songs"].append(current_song)

    print(f'已导入{current_year}数据')
    return data

def update_json_with_txt(txt_file_path, json_file_path):
    # 读取现有JSON数据

    existing_data = []
    if os.path.exists(json_file_path):
        try:
            with open(json_file_path, 'r', encoding='utf-8') as f:
                if os.path.getsize(json_file_path) > 0:
                    existing_data = json.load(f)
        except (json.JSONDecodeError, Exception) as e:
            print(f"Warning: Error reading JSON file, starting fresh: {str(e)}")
            existing_data = []

    # 读取TXT文件内容
    with open(txt_file_path, 'r', encoding='utf-8') as f:
        txt_content = f.read()

    # 解析并合并数据
    updated_data = parse_txt_to_json(txt_content, existing_data)

    # 写回JSON文件
    with open(json_file_path, 'w', encoding='utf-8') as f:
        json.dump(updated_data, f, ensure_ascii=False, indent=2, separators=(',', ': '))

# 使用示例
if __name__ == "__main__":
    # 将DT_1997.txt的内容合并到DT.json中
   with open('DT.json', "w", encoding="utf-8") as file:
        file.write('[]')
   years=[1997,1998,1999,2000,2001,2002,2003,2004,2005,2006,2007,2008,2009,2012,2013,2014,2016,2017,2019,2020,2023,2024,2025]
   for y in years:
       update_json_with_txt(f"DT_{y}.txt", "DT.json")

