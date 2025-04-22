import os
import datetime

def create_year_txt_files(folder_path, start_year=1995, end_year=2025):
    """
    批量创建DT_Year.txt文件，自动跳过已存在的文件

    参数：
    folder_path - 目标文件夹路径
    start_year - 起始年份（默认1995）
    end_year - 结束年份（默认2025）
    """
    if not os.path.exists(folder_path):
        os.makedirs(folder_path)

    for year in range(start_year, end_year + 1):
        filename = f"DT_{year}.txt"
        filepath = os.path.join(folder_path, filename)

        if not os.path.exists(filepath):  # 检查文件是否已存在
            try:
                with open(filepath, 'x', encoding='utf-8') as f:  # 'x'模式确保不覆盖
                    f.write(f"Year: {year}\nCreated on: {datetime.datetime.now()}")
                print(f"已创建: {filename}")
            except FileExistsError:  # 双重检查防止竞态条件
                print(f"文件已存在（跳过）: {filename}")
        else:
            print(f"文件已存在（跳过）: {filename}")


# 使用示例
create_year_txt_files("D:\Desktop\音乐网站搭建\data", 1990, 2050)