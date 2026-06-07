import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from database import engine, SessionLocal, Base
from models import User, Team, KnockoutMatch, SystemConfig
from auth import hash_password

Base.metadata.create_all(bind=engine)

db = SessionLocal()

admin = db.query(User).filter(User.username == "老朴宅在家").first()
if not admin:
    admin = User(
        username="老朴宅在家",
        password_hash=hash_password("songhaofeng"),
        role="admin",
        balance=999999.0,
    )
    db.add(admin)
    db.commit()
    print("管理员账号已创建")

if db.query(SystemConfig).filter(SystemConfig.key == "current_phase").first() is None:
    db.add(SystemConfig(key="current_phase", value="group"))
    db.commit()

TEAMS = [
    # Group A
    ("Mexico", "墨西哥", "🇲🇽", "A"),
    ("South Africa", "南非", "🇿🇦", "A"),
    ("South Korea", "韩国", "🇰🇷", "A"),
    ("Czech Republic", "捷克", "🇨🇿", "A"),
    # Group B
    ("Canada", "加拿大", "🇨🇦", "B"),
    ("Bosnia and Herzegovina", "波黑", "🇧🇦", "B"),
    ("Qatar", "卡塔尔", "🇶🇦", "B"),
    ("Switzerland", "瑞士", "🇨🇭", "B"),
    # Group C
    ("Brazil", "巴西", "🇧🇷", "C"),
    ("Morocco", "摩洛哥", "🇲🇦", "C"),
    ("Haiti", "海地", "🇭🇹", "C"),
    ("Scotland", "苏格兰", "🏴‍☠️", "C"),
    # Group D
    ("United States", "美国", "🇺🇸", "D"),
    ("Paraguay", "巴拉圭", "🇵🇾", "D"),
    ("Australia", "澳大利亚", "🇦🇺", "D"),
    ("Turkey", "土耳其", "🇹🇷", "D"),
    # Group E
    ("Germany", "德国", "🇩🇪", "E"),
    ("Curacao", "库拉索", "🇨🇼", "E"),
    ("Ivory Coast", "科特迪瓦", "🇨🇮", "E"),
    ("Ecuador", "厄瓜多尔", "🇪🇨", "E"),
    # Group F
    ("Netherlands", "荷兰", "🇳🇱", "F"),
    ("Japan", "日本", "🇯🇵", "F"),
    ("Sweden", "瑞典", "🇸🇪", "F"),
    ("Tunisia", "突尼斯", "🇹🇳", "F"),
    # Group G
    ("Belgium", "比利时", "🇧🇪", "G"),
    ("Egypt", "埃及", "🇪🇬", "G"),
    ("Iran", "伊朗", "🇮🇷", "G"),
    ("New Zealand", "新西兰", "🇳🇿", "G"),
    # Group H
    ("Spain", "西班牙", "🇪🇸", "H"),
    ("Cape Verde", "佛得角", "🇨🇻", "H"),
    ("Saudi Arabia", "沙特阿拉伯", "🇸🇦", "H"),
    ("Uruguay", "乌拉圭", "🇺🇾", "H"),
    # Group I
    ("France", "法国", "🇫🇷", "I"),
    ("Senegal", "塞内加尔", "🇸🇳", "I"),
    ("Iraq", "伊拉克", "🇮🇶", "I"),
    ("Norway", "挪威", "🇳🇴", "I"),
    # Group J
    ("Argentina", "阿根廷", "🇦🇷", "J"),
    ("Algeria", "阿尔及利亚", "🇩🇿", "J"),
    ("Austria", "奥地利", "🇦🇹", "J"),
    ("Jordan", "约旦", "🇯🇴", "J"),
    # Group K
    ("Portugal", "葡萄牙", "🇵🇹", "K"),
    ("DR Congo", "刚果(金)", "🇨🇩", "K"),
    ("Uzbekistan", "乌兹别克斯坦", "🇺🇿", "K"),
    ("Colombia", "哥伦比亚", "🇨🇴", "K"),
    # Group L
    ("England", "英格兰", "🏴󠁧󠁢󠁥󠁮󠁧󠁿", "L"),
    ("Croatia", "克罗地亚", "🇭🇷", "L"),
    ("Ghana", "加纳", "🇬🇭", "L"),
    ("Panama", "巴拿马", "🇵🇦", "L"),
]

if db.query(Team).count() == 0:
    for name, name_cn, flag, group in TEAMS:
        team = Team(name=name, name_cn=name_cn, flag=flag, group_name=group)
        db.add(team)
    db.commit()
    print(f"已添加 {len(TEAMS)} 支球队")

if db.query(KnockoutMatch).count() == 0:
    # Round of 32 (16 matches)
    r32_placeholders = [
        ("A组第1名", "C组第3名/D组第3名/E组第3名"),
        ("B组第1名", "A组第3名/D组第3名/E组第3名"),
        ("C组第1名", "A组第3名/B组第3名/F组第3名"),
        ("D组第1名", "B组第3名/E组第3名/F组第3名"),
        ("E组第1名", "A组第3名/B组第3名/C组第3名"),
        ("F组第1名", "C组第3名/D组第3名/E组第3名"),
        ("G组第1名", "H组第2名"),
        ("H组第1名", "G组第2名"),
        ("I组第1名", "J组第2名"),
        ("J组第1名", "I组第2名"),
        ("K组第1名", "L组第2名"),
        ("L组第1名", "K组第2名"),
        ("A组第2名", "B组第2名"),
        ("C组第2名", "D组第2名"),
        ("E组第2名", "F组第2名"),
        ("I组第2名 / J组第2名", "K组第2名 / L组第2名"),
    ]
    r32_matches = []
    for i, (p1, p2) in enumerate(r32_placeholders):
        m = KnockoutMatch(round_name="round_32", match_order=i + 1, team1_placeholder=p1, team2_placeholder=p2)
        db.add(m)
        db.flush()
        r32_matches.append(m)

    # Round of 16 (8 matches)
    r16_matches = []
    for i in range(8):
        m = KnockoutMatch(round_name="round_16", match_order=i + 1, team1_placeholder="待定", team2_placeholder="待定")
        db.add(m)
        db.flush()
        r16_matches.append(m)
    for i in range(8):
        r32_matches[i * 2].next_match_id = r16_matches[i].id
        r32_matches[i * 2].next_match_slot = 1
        r32_matches[i * 2 + 1].next_match_id = r16_matches[i].id
        r32_matches[i * 2 + 1].next_match_slot = 2

    # Quarter-finals (4 matches)
    qf_matches = []
    for i in range(4):
        m = KnockoutMatch(round_name="quarter_final", match_order=i + 1, team1_placeholder="待定", team2_placeholder="待定")
        db.add(m)
        db.flush()
        qf_matches.append(m)
    for i in range(4):
        r16_matches[i * 2].next_match_id = qf_matches[i].id
        r16_matches[i * 2].next_match_slot = 1
        r16_matches[i * 2 + 1].next_match_id = qf_matches[i].id
        r16_matches[i * 2 + 1].next_match_slot = 2

    # Semi-finals (2 matches)
    sf_matches = []
    for i in range(2):
        m = KnockoutMatch(round_name="semi_final", match_order=i + 1, team1_placeholder="待定", team2_placeholder="待定")
        db.add(m)
        db.flush()
        sf_matches.append(m)
    for i in range(2):
        qf_matches[i * 2].next_match_id = sf_matches[i].id
        qf_matches[i * 2].next_match_slot = 1
        qf_matches[i * 2 + 1].next_match_id = sf_matches[i].id
        qf_matches[i * 2 + 1].next_match_slot = 2

    # Third-place playoff
    third = KnockoutMatch(round_name="third_place", match_order=1, team1_placeholder="待定", team2_placeholder="待定")
    db.add(third)
    db.flush()

    # Final
    final = KnockoutMatch(round_name="final", match_order=1, team1_placeholder="待定", team2_placeholder="待定")
    db.add(final)
    db.flush()
    sf_matches[0].next_match_id = final.id
    sf_matches[0].next_match_slot = 1
    sf_matches[1].next_match_id = final.id
    sf_matches[1].next_match_slot = 2

    db.commit()
    print("淘汰赛对阵已初始化")

db.close()
print("数据库初始化完成！")
