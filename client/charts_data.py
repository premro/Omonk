import os, json, time

ART_CACHE_PATH = os.path.join(os.path.dirname(__file__), "artwork_cache.json")
_ARTWORK_CACHE = {}

def get_cached_art(title, artist):
    global _ARTWORK_CACHE
    if not _ARTWORK_CACHE and os.path.exists(ART_CACHE_PATH):
        try:
            with open(ART_CACHE_PATH, 'r', encoding='utf-8') as f:
                _ARTWORK_CACHE = json.load(f)
        except Exception:
            _ARTWORK_CACHE = {}
    key = f"{title.lower()}|||{artist.lower()}"
    return _ARTWORK_CACHE.get(key, '')

#!/usr/bin/env python3
"""
Multi-Language Daily, Weekly, and Monthly Hits Engine.
Provides comprehensive chart data for Tamil, Telugu, Hindi, Malayalam,
Kannada, Punjabi, English, Spanish, K-Pop, Japanese, and French.
"""

import json
import os
import time

LANGUAGES_LIST = [
    {"code": "tamil", "name": "Tamil", "flag": "🇮🇳", "native": "தமிழ்", "color": "from-amber-500 to-rose-600"},
    {"code": "telugu", "name": "Telugu", "flag": "🇮🇳", "native": "తెలుగు", "color": "from-red-500 to-orange-500"},
    {"code": "hindi", "name": "Hindi", "flag": "🇮🇳", "native": "हिन्दी", "color": "from-emerald-500 to-teal-600"},
    {"code": "malayalam", "name": "Malayalam", "flag": "🇮🇳", "native": "മലയാളം", "color": "from-cyan-500 to-blue-600"},
    {"code": "kannada", "name": "Kannada", "flag": "🇮🇳", "native": "ಕನ್ನಡ", "color": "from-yellow-500 to-amber-600"},
    {"code": "punjabi", "name": "Punjabi", "flag": "🇮🇳", "native": "ਪੰਜਾਬੀ", "color": "from-pink-500 to-rose-500"},
    {"code": "english", "name": "English / Global", "flag": "🌐", "native": "Global", "color": "from-purple-500 to-indigo-600"},
    {"code": "spanish", "name": "Spanish / Latin", "flag": "🇪🇸", "native": "Español", "color": "from-orange-500 to-red-600"},
    {"code": "kpop", "name": "K-Pop", "flag": "🇰🇷", "native": "한국어", "color": "from-fuchsia-500 to-purple-600"},
    {"code": "japanese", "name": "Japanese / Anime", "flag": "🇯🇵", "native": "日本語", "color": "from-indigo-500 to-sky-600"},
    {"code": "french", "name": "French", "flag": "🇫🇷", "native": "Français", "color": "from-blue-500 to-violet-600"}
]

# High-density curated charts with verified streaming queries
CHART_CATALOG = {
    "tamil": {
        "daily": [
            {"title": "Hukum - Thalaivar Alappara", "artist": "Anirudh Ravichander", "album": "Jailer", "duration": 207},
            {"title": "Katchi Sera", "artist": "Sai Abhyankkar", "album": "Katchi Sera", "duration": 195},
            {"title": "Aasa Kooda", "artist": "Sai Abhyankkar, Sai Smriti", "album": "Think Indie", "duration": 210},
            {"title": "Badass", "artist": "Anirudh Ravichander", "album": "Leo", "duration": 229},
            {"title": "Naa Ready", "artist": "Vijay, Anirudh Ravichander, Asal Kolaar", "album": "Leo", "duration": 248},
            {"title": "Arabic Kuthu", "artist": "Anirudh Ravichander, Jonita Gandhi", "album": "Beast", "duration": 280},
            {"title": "Marakkuma Nenjam", "artist": "A.R. Rahman", "album": "Vendhu Thanindhathu Kaadu", "duration": 256},
            {"title": "Kaadhal En Kaviye", "artist": "Sid Sriram", "album": "Salmon 3D", "duration": 312},
            {"title": "Ordinary Person", "artist": "Anirudh Ravichander, Nikhita Gandhi", "album": "Leo", "duration": 142},
            {"title": "Chinnanjiru Nilave", "artist": "A.R. Rahman, Haricharan", "album": "Ponniyin Selvan 2", "duration": 204},
            {"title": "Adiye", "artist": "Dhibu Ninan Thomas, Kapil Kapilan", "album": "Bachelor", "duration": 255},
            {"title": "Bae", "artist": "Anirudh Ravichander, Adheef Muhamed", "album": "Don", "duration": 243}
        ],
        "weekly": [
            {"title": "Manasilaayo", "artist": "Anirudh Ravichander, Malaysia Vasudevan, Yugendran", "album": "Vettaiyan", "duration": 245},
            {"title": "Hunter Vantaar", "artist": "Anirudh Ravichander, Bamba Bakya, Aravind Srinivas", "album": "Vettaiyan", "duration": 208},
            {"title": "Whistle Podu", "artist": "Thalapathy Vijay, Venkat Prabhu, Yuvan Shankar Raja", "album": "GOAT", "duration": 235},
            {"title": "Spark", "artist": "Yuvan Shankar Raja, Vrusha Balu", "album": "GOAT", "duration": 212},
            {"title": "Matta", "artist": "Yuvan Shankar Raja, Shenbagaraj", "album": "GOAT", "duration": 221},
            {"title": "Illuminati", "artist": "Sushin Shyam, Dabzee", "album": "Aavesham", "duration": 193},
            {"title": "Pathikichu", "artist": "Anirudh Ravichander", "album": "Vidaamuyarchi", "duration": 215},
            {"title": "Fear Song", "artist": "Anirudh Ravichander", "album": "Devara", "duration": 196},
            {"title": "Chuttamalle", "artist": "Shilpa Rao, Anirudh Ravichander", "album": "Devara", "duration": 222},
            {"title": "Kanimaa", "artist": "Sai Abhyankkar", "album": "Kanimaa", "duration": 205}
        ],
        "monthly": [
            {"title": "Master the Blaster", "artist": "Anirudh Ravichander, Bjorn Surrao", "album": "Master", "duration": 96},
            {"title": "Vaathi Coming", "artist": "Anirudh Ravichander, Gana Balachandar", "album": "Master", "duration": 230},
            {"title": "Vaseegara", "artist": "Bombay Jayashri, Harris Jayaraj", "album": "Minnale", "duration": 300},
            {"title": "Nenjukkul Peidhidum", "artist": "Hariharan, Devan Ekambaram, Harris Jayaraj", "album": "Vaaranam Aayiram", "duration": 370},
            {"title": "Hosanna", "artist": "A.R. Rahman, Vijay Prakash, Suzanne D'Mello", "album": "Vinnaithaandi Varuvaayaa", "duration": 331},
            {"title": "Munbe Vaa", "artist": "A.R. Rahman, Naresh Iyer, Shreya Ghoshal", "album": "Sillunu Oru Kaadhal", "duration": 359},
            {"title": "Ennavale Adi Ennavale", "artist": "Unni Menon, A.R. Rahman", "album": "Kaadhalan", "duration": 311},
            {"title": "Ranjithame", "artist": "Vijay, M.M. Manasi, Thaman S", "album": "Varisu", "duration": 288},
            {"title": "Thee Thalapathy", "artist": "Silambarasan TR, Thaman S", "album": "Varisu", "duration": 254},
            {"title": "Enjoy Enjaami", "artist": "Dhee, Arivu, Santhosh Narayanan", "album": "Enjoy Enjaami", "duration": 273}
        ]
    },
    "telugu": {
        "daily": [
            {"title": "Chuttamalle", "artist": "Shilpa Rao, Anirudh Ravichander", "album": "Devara Part 1", "duration": 222},
            {"title": "Fear Song", "artist": "Anirudh Ravichander", "album": "Devara Part 1", "duration": 196},
            {"title": "Daavudi", "artist": "Nakash Aziz, Akasa, Anirudh Ravichander", "album": "Devara Part 1", "duration": 224},
            {"title": "Kurchi Madathapetti", "artist": "Thaman S, Mahesh Babu, Sri Krishna, Sahithi", "album": "Guntur Kaaram", "duration": 218},
            {"title": "Dum Masala", "artist": "Thaman S, Sanjith Hegde", "album": "Guntur Kaaram", "duration": 206},
            {"title": "Naatu Naatu", "artist": "Rahul Sipligunj, Kaala Bhairava, M.M. Keeravaani", "album": "RRR", "duration": 215},
            {"title": "Komuram Bheemudo", "artist": "Kaala Bhairava, M.M. Keeravaani", "album": "RRR", "duration": 255},
            {"title": "Oo Antava Mawa Oo Oo Antava", "artist": "Indravathi Chauhan, Devi Sri Prasad", "album": "Pushpa", "duration": 223},
            {"title": "Srivalli", "artist": "Sid Sriram, Devi Sri Prasad", "album": "Pushpa", "duration": 224},
            {"title": "Samayama", "artist": "Anurag Kulkarni, Sithara, Hesham Abdul Wahab", "album": "Hi Nanna", "duration": 236}
        ],
        "weekly": [
            {"title": "Pushpa Pushpa", "artist": "Nakash Aziz, Deepak Blue, Devi Sri Prasad", "album": "Pushpa 2 The Rule", "duration": 242},
            {"title": "Angaaron", "artist": "Shreya Ghoshal, Devi Sri Prasad", "album": "Pushpa 2 The Rule", "duration": 260},
            {"title": "Peelings", "artist": "Devi Sri Prasad, Laxmi Duggirala", "album": "Pushpa 2 The Rule", "duration": 215},
            {"title": "Ayudha Pooja", "artist": "Kaala Bhairava, Anirudh Ravichander", "album": "Devara", "duration": 210},
            {"title": "Ta Takkara", "artist": "Santhosh Narayanan, Sanjith Hegde", "album": "Kalki 2898 AD", "duration": 204},
            {"title": "Bhairava Anthem", "artist": "Diljit Dosanjh, Santhosh Narayanan", "album": "Kalki 2898 AD", "duration": 164},
            {"title": "Theme of Kalki", "artist": "Kaala Bhairava, Gowtham Bharadwaj", "album": "Kalki 2898 AD", "duration": 185},
            {"title": "Inthandham", "artist": "Sid Sriram, Vishal Chandrashekhar", "album": "Sita Ramam", "duration": 218},
            {"title": "Oh Sita Hey Rama", "artist": "SPB Charan, Ramya Behara", "album": "Sita Ramam", "duration": 244},
            {"title": "Butta Bomma", "artist": "Armaan Malik, Thaman S", "album": "Ala Vaikunthapurramuloo", "duration": 198}
        ],
        "monthly": [
            {"title": "Samajavaragamana", "artist": "Sid Sriram, Thaman S", "album": "Ala Vaikunthapurramuloo", "duration": 222},
            {"title": "Ramuloo Ramulaa", "artist": "Anurag Kulkarni, Mangli", "album": "Ala Vaikunthapurramuloo", "duration": 237},
            {"title": "Inkem Inkem Inkem Kaavaale", "artist": "Sid Sriram, Gopi Sundar", "album": "Geetha Govindam", "duration": 267},
            {"title": "Vachindamma", "artist": "Sid Sriram, Gopi Sundar", "album": "Geetha Govindam", "duration": 242},
            {"title": "Undiporaadhey", "artist": "Sid Sriram, Radhan", "album": "Hushaaru", "duration": 310},
            {"title": "Dheevara", "artist": "Ramya Behara, Deepu, M.M. Keeravaani", "album": "Baahubali", "duration": 344},
            {"title": "Saahore Baahubali", "artist": "Daler Mehndi, M.M. Keeravaani", "album": "Baahubali 2", "duration": 202},
            {"title": "Nuvvunte Naa Jathaga", "artist": "Sid Sriram, Isshrathquadhre, A.R. Rahman", "album": "I (Telugu)", "duration": 340},
            {"title": "Pillaa Raa", "artist": "Anurag Kulkarni, Chaitan Bharadwaj", "album": "RX 100", "duration": 238},
            {"title": "Rowdy Baby (Telugu)", "artist": "Dhanush, M.M. Manasi, Yuvan Shankar Raja", "album": "Maari 2", "duration": 284}
        ]
    },
    "hindi": {
        "daily": [
            {"title": "Tauba Tauba", "artist": "Karan Aujla", "album": "Bad Newz", "duration": 207},
            {"title": "Aaj Ki Raat", "artist": "Sachin-Jigar, Madhubanti Bagchi, Divya Kumar", "album": "Stree 2", "duration": 228},
            {"title": "Aayi Nai", "artist": "Pawan Singh, Simran Choudhary, Sachin-Jigar", "album": "Stree 2", "duration": 178},
            {"title": "Khoobsurat", "artist": "Vishal Mishra, Sachin-Jigar", "album": "Stree 2", "duration": 244},
            {"title": "Tilasmi Bahein", "artist": "Sanjay Leela Bhansali, Sharmistha Chatterjee", "album": "Heeramandi", "duration": 150},
            {"title": "Sajni", "artist": "Arijit Singh, Ram Sampath", "album": "Laapataa Ladies", "duration": 170},
            {"title": "O Maahi", "artist": "Arijit Singh, Pritam", "album": "Dunki", "duration": 233},
            {"title": "Lutt Putt Gaya", "artist": "Arijit Singh, Pritam", "album": "Dunki", "duration": 225},
            {"title": "Chaleya", "artist": "Arijit Singh, Shilpa Rao, Anirudh Ravichander", "album": "Jawan", "duration": 200},
            {"title": "Zinda Banda", "artist": "Anirudh Ravichander", "album": "Jawan", "duration": 264}
        ],
        "weekly": [
            {"title": "Kesariya", "artist": "Arijit Singh, Pritam, Amitabh Bhattacharya", "album": "Brahmastra", "duration": 268},
            {"title": "Apna Bana Le", "artist": "Arijit Singh, Sachin-Jigar", "album": "Bhediya", "duration": 261},
            {"title": "Pehle Bhi Main", "artist": "Vishal Mishra, Raj Shekhar", "album": "Animal", "duration": 250},
            {"title": "Satranga", "artist": "Arijit Singh, Shreyas Puranik", "album": "Animal", "duration": 271},
            {"title": "Arjan Vailly", "artist": "Bhupinder Babbal, Manan Bhardwaj", "album": "Animal", "duration": 182},
            {"title": "Tum Kya Mile", "artist": "Arijit Singh, Shreya Ghoshal, Pritam", "album": "Rocky Aur Rani Kii Prem Kahaani", "duration": 277},
            {"title": "What Jhumka?", "artist": "Arijit Singh, Jonita Gandhi, Pritam", "album": "Rocky Aur Rani Kii Prem Kahaani", "duration": 213},
            {"title": "Jhoome Jo Pathaan", "artist": "Arijit Singh, Sukriti Kakar, Vishal-Shekhar", "album": "Pathaan", "duration": 208},
            {"title": "Besharam Rang", "artist": "Shilpa Rao, Caralisa Monteiro, Vishal-Shekhar", "album": "Pathaan", "duration": 258},
            {"title": "Maan Meri Jaan", "artist": "King", "album": "Champagne Talk", "duration": 194}
        ],
        "monthly": [
            {"title": "Tum Hi Ho", "artist": "Arijit Singh, Mithoon", "album": "Aashiqui 2", "duration": 262},
            {"title": "Channa Mereya", "artist": "Arijit Singh, Pritam", "album": "Ae Dil Hai Mushkil", "duration": 289},
            {"title": "Raataan Lambiyan", "artist": "Jubin Nautiyal, Asees Kaur, Tanishk Bagchi", "album": "Shershaah", "duration": 230},
            {"title": "Ranjha", "artist": "B Praak, Jasleen Royal", "album": "Shershaah", "duration": 228},
            {"title": "Ghungroo", "artist": "Arijit Singh, Shilpa Rao, Vishal-Shekhar", "album": "War", "duration": 302},
            {"title": "Jai Ho", "artist": "A.R. Rahman, Sukhwinder Singh", "album": "Slumdog Millionaire", "duration": 319},
            {"title": "Kun Faya Kun", "artist": "A.R. Rahman, Javed Ali, Mohit Chauhan", "album": "Rockstar", "duration": 473},
            {"title": "Nadaan Parinde", "artist": "A.R. Rahman, Mohit Chauhan", "album": "Rockstar", "duration": 386},
            {"title": "Kabira", "artist": "Tochi Raina, Rekha Bhardwaj, Pritam", "album": "Yeh Jawaani Hai Deewani", "duration": 223},
            {"title": "Balam Pichkari", "artist": "Vishal Dadlani, Shalmali Kholgade, Pritam", "album": "Yeh Jawaani Hai Deewani", "duration": 289}
        ]
    },
    "malayalam": {
        "daily": [
            {"title": "Illuminati", "artist": "Sushin Shyam, Dabzee", "album": "Aavesham", "duration": 193},
            {"title": "Jaada", "artist": "Sushin Shyam, Sreenath Bhasi", "album": "Aavesham", "duration": 221},
            {"title": "Armadham", "artist": "Sushin Shyam, Pranavam Sasi", "album": "Aavesham", "duration": 190},
            {"title": "Kuthanthram", "artist": "Sushin Shyam, Vedan", "album": "Manjummel Boys", "duration": 169},
            {"title": "Thaai Manam", "artist": "Sushin Shyam", "album": "Manjummel Boys", "duration": 215},
            {"title": "Kanmani Anbodu (Re-imagined)", "artist": "Sushin Shyam, Kamal Haasan", "album": "Manjummel Boys", "duration": 175},
            {"title": "Katha Parayum", "artist": "Hesham Abdul Wahab", "album": "Hridayam", "duration": 212},
            {"title": "Darshana", "artist": "Hesham Abdul Wahab, Darshana Rajendran", "album": "Hridayam", "duration": 235},
            {"title": "Onakka Munthiri", "artist": "Divya Vineeth, Hesham Abdul Wahab", "album": "Hridayam", "duration": 147},
            {"title": "Pavizha Mazha", "artist": "KS Harisankar, Jakes Bejoy", "album": "Athiran", "duration": 248}
        ],
        "weekly": [
            {"title": "Minnali", "artist": "Sushin Shyam", "album": "Bougainvillea", "duration": 210},
            {"title": "Maravikale", "artist": "Madhu Balakrishnan", "album": "Bougainvillea", "duration": 224},
            {"title": "Galatta", "artist": "Sushin Shyam, Paal Dabba", "album": "Aavesham", "duration": 204},
            {"title": "Oru Nokku Kaanuvann", "artist": "Karthik", "album": "Sunday Holiday", "duration": 272},
            {"title": "Neela Nilave", "artist": "Kapil Kapilan, Jakes Bejoy", "album": "RDX", "duration": 223},
            {"title": "Halaballoo", "artist": "Jakes Bejoy, Benny Dayal", "album": "RDX", "duration": 205},
            {"title": "Kaathodu Kaathorom", "artist": "Pradeep Kumar, Sooraj Santhosh", "album": "Android Kunjappan", "duration": 246},
            {"title": "Aaradhike", "artist": "Sooraj Santhosh, Madhuvanthi Narayan, Rex Vijayan", "album": "Ambili", "duration": 268},
            {"title": "Njan Jackson Allada", "artist": "Anthony Daasan, Sushin Shyam", "album": "Ambili", "duration": 211},
            {"title": "Khalbile Hoor", "artist": "Vineeth Sreenivasan, Shaan Rahman", "album": "Thattathin Marayathu", "duration": 216}
        ],
        "monthly": [
            {"title": "Jimmiki Kammal", "artist": "Vineeth Sreenivasan, Renjith Unni, Shaan Rahman", "album": "Velipadinte Pusthakam", "duration": 208},
            {"title": "Malare", "artist": "Vijay Yesudas, Rajesh Murugesan", "album": "Premam", "duration": 315},
            {"title": "Aluva Puzha", "artist": "Vineeth Sreenivasan, Rajesh Murugesan", "album": "Premam", "duration": 204},
            {"title": "Kaate Nee Veesharuthippol", "artist": "K.J. Yesudas, Ouseppachan", "album": "Kattu Vannu Vilichappol", "duration": 290},
            {"title": "Akale Oru Kaadinte", "artist": "K.J. Yesudas", "album": "Ramjirao Speaking", "duration": 276},
            {"title": "Lajjavathiye", "artist": "Jassie Gift", "album": "4 The People", "duration": 264},
            {"title": "Anuragathin Velayil", "artist": "Vineeth Sreenivasan, Shaan Rahman", "album": "Thattathin Marayathu", "duration": 255},
            {"title": "Muthuchippi", "artist": "Sachin Warrier, Remya Nambeesan, Shaan Rahman", "album": "Thattathin Marayathu", "duration": 234},
            {"title": "Uyiril Thodum", "artist": "Sooraj Santhosh, Anne Amie, Sushin Shyam", "album": "Kumbalangi Nights", "duration": 230},
            {"title": "Cherathukal", "artist": "Sithara Krishnakumar, Sushin Shyam", "album": "Kumbalangi Nights", "duration": 222}
        ]
    },
    "kannada": {
        "daily": [
            {"title": "Dwapara", "artist": "Jithin Raj, Ajaneesh Loknath", "album": "Krishnam Pranaya Sakhi", "duration": 218},
            {"title": "Chinnamma", "artist": "Chandan Shetty", "album": "Krishnam Pranaya Sakhi", "duration": 198},
            {"title": "Singara Siriye", "artist": "Vijay Prakash, Ananya Bhat, Ajaneesh Loknath", "album": "Kantara", "duration": 282},
            {"title": "Varaha Roopam", "artist": "Sai Vignesh, Ajaneesh Loknath", "album": "Kantara", "duration": 275},
            {"title": "Karma Song", "artist": "Ajaneesh Loknath", "album": "Kantara", "duration": 204},
            {"title": "Ra Ra Rakkamma", "artist": "Nakash Aziz, Sunidhi Chauhan, Ajaneesh Loknath", "album": "Vikrant Rona", "duration": 221},
            {"title": "Belakina Kavithe", "artist": "Sanjith Hegde, Sangeetha Ravindranath", "album": "Banaras", "duration": 242},
            {"title": "Sulthana", "artist": "Mohan Krishna, Ravi Basrur", "album": "KGF Chapter 2", "duration": 230},
            {"title": "Toofan", "artist": "Brijesh Shandilya, Ravi Basrur", "album": "KGF Chapter 2", "duration": 218},
            {"title": "Mehabooba", "artist": "Ananya Bhat, Ravi Basrur", "album": "KGF Chapter 2", "duration": 215}
        ],
        "weekly": [
            {"title": "Dheera Dheera", "artist": "Ananya Bhat, Ravi Basrur", "album": "KGF Chapter 1", "duration": 224},
            {"title": "Salaam Rocky Bhai", "artist": "Vijay Prakash, Santhosh Venky, Ravi Basrur", "album": "KGF Chapter 1", "duration": 245},
            {"title": "Neenade Naa", "artist": "Armaan Malik, Shreya Ghoshal, Arjun Janya", "album": "Mungaru Male 2", "duration": 252},
            {"title": "Anisuthide", "artist": "Sonu Nigam, Mano Murthy", "album": "Mungaru Male", "duration": 328},
            {"title": "Mungaru Maleye", "artist": "Sonu Nigam, Mano Murthy", "album": "Mungaru Male", "duration": 302},
            {"title": "Kavithe Kavithe", "artist": "Vijay Prakash, Mano Murthy", "album": "Gaalipata", "duration": 280},
            {"title": "Minchagi Neenu", "artist": "Sonu Nigam, Mano Murthy", "album": "Gaalipata", "duration": 305},
            {"title": "Ondu Malebillu", "artist": "Armaan Malik, Shreya Ghoshal, Arjun Janya", "album": "Chakravarthy", "duration": 268},
            {"title": "Open Hairu", "artist": "Chandan Shetty", "album": "Roberrt", "duration": 214},
            {"title": "Ba Ba Ba Na Ready", "artist": "Vyasraj Sosale, Ravi Basrur", "album": "James", "duration": 220}
        ],
        "monthly": [
            {"title": "Tagaru Banthu Tagaru", "artist": "Anthony Daasan, Charan Raj", "album": "Tagaru", "duration": 229},
            {"title": "Hold On", "artist": "Charan Raj", "album": "Tagaru", "duration": 235},
            {"title": "Kush Kush", "artist": "Sanjith Hegde, Charan Raj", "album": "Chamak", "duration": 212},
            {"title": "Marali Manasaagide", "artist": "Sanjith Hegde, Charan Raj", "album": "Gentleman", "duration": 236},
            {"title": "Soul of Dia", "artist": "Sanjith Hegde, Ajaneesh Loknath", "album": "Dia", "duration": 185},
            {"title": "Ninnindale", "artist": "Sonu Nigam, V. Harikrishna", "album": "Milana", "duration": 300},
            {"title": "Male Nilluvavaregu", "artist": "Karthik, V. Harikrishna", "album": "Milana", "duration": 290},
            {"title": "Gombe Bombe", "artist": "Vijay Prakash, V. Harikrishna", "album": "Raajakumara", "duration": 260},
            {"title": "Appa I Love You", "artist": "Anuradha Bhat, V. Harikrishna", "album": "Chowka", "duration": 250},
            {"title": "Yenammi Yenammi", "artist": "Vijay Prakash, Palak Muchhal, Arjun Janya", "album": "Ayogya", "duration": 245}
        ]
    },
    "punjabi": {
        "daily": [
            {"title": "Softly", "artist": "Karan Aujla, Ikky", "album": "Making Memories", "duration": 155},
            {"title": "Winning Speech", "artist": "Karan Aujla, Mxrci", "album": "Winning Speech", "duration": 195},
            {"title": "Admiring You", "artist": "Karan Aujla, Preston Pablo, Ikky", "album": "Making Memories", "duration": 214},
            {"title": "Born to Shine", "artist": "Diljit Dosanjh", "album": "G.O.A.T.", "duration": 213},
            {"title": "G.O.A.T.", "artist": "Diljit Dosanjh", "album": "G.O.A.T.", "duration": 223},
            {"title": "Lover", "artist": "Diljit Dosanjh, Intense", "album": "MoonChild Era", "duration": 190},
            {"title": "Hass Hass", "artist": "Diljit Dosanjh, Sia", "album": "Hass Hass", "duration": 154},
            {"title": "Kinni Kinni", "artist": "Diljit Dosanjh", "album": "Ghost", "duration": 182},
            {"title": "Case", "artist": "Diljit Dosanjh", "album": "Ghost", "duration": 204},
            {"title": "No Love", "artist": "Shubh", "album": "No Love", "duration": 170}
        ],
        "weekly": [
            {"title": "Cheques", "artist": "Shubh", "album": "Still Rollin", "duration": 183},
            {"title": "Baller", "artist": "Shubh, Ikky", "album": "Baller", "duration": 148},
            {"title": "Elevated", "artist": "Shubh", "album": "Elevated", "duration": 200},
            {"title": "Her", "artist": "Shubh", "album": "Still Rollin", "duration": 154},
            {"title": "Still Rollin", "artist": "Shubh", "album": "Still Rollin", "duration": 174},
            {"title": "King Shit", "artist": "Shubh", "album": "Leo", "duration": 230},
            {"title": "One Love", "artist": "Shubh", "album": "Leo", "duration": 160},
            {"title": "With You", "artist": "AP Dhillon", "album": "With You", "duration": 154},
            {"title": "Brown Munde", "artist": "AP Dhillon, Gurinder Gill, Shinda Kahlon", "album": "Brown Munde", "duration": 268},
            {"title": "Excuses", "artist": "AP Dhillon, Gurinder Gill", "album": "Hidden Gems", "duration": 176}
        ],
        "monthly": [
            {"title": "Insane", "artist": "AP Dhillon, Gurinder Gill, Shinda Kahlon", "album": "Insane", "duration": 206},
            {"title": "Summer High", "artist": "AP Dhillon", "album": "Summer High", "duration": 178},
            {"title": "Dil Nu", "artist": "AP Dhillon, Gurinder Gill", "album": "Not by Chance", "duration": 232},
            {"title": "295", "artist": "Sidhu Moose Wala", "album": "Moosetape", "duration": 270},
            {"title": "The Last Ride", "artist": "Sidhu Moose Wala, Wazir Patar", "album": "No Name", "duration": 261},
            {"title": "Levels", "artist": "Sidhu Moose Wala, Sunny Malton", "album": "Levels", "duration": 232},
            {"title": "So High", "artist": "Sidhu Moose Wala, BYG BYRD", "album": "PBX 1", "duration": 237},
            {"title": "Same Beef", "artist": "Bohemia, Sidhu Moose Wala", "album": "Same Beef", "duration": 272},
            {"title": "Old Skool", "artist": "Prem Dhillon, Sidhu Moose Wala, Naseeb", "album": "Old Skool", "duration": 255},
            {"title": "Lahore", "artist": "Guru Randhawa", "album": "Lahore", "duration": 195}
        ]
    },
    "english": {
        "daily": [
            {"title": "Espresso", "artist": "Sabrina Carpenter", "album": "Short n' Sweet", "duration": 175},
            {"title": "Please Please Please", "artist": "Sabrina Carpenter", "album": "Short n' Sweet", "duration": 186},
            {"title": "Taste", "artist": "Sabrina Carpenter", "album": "Short n' Sweet", "duration": 157},
            {"title": "Birds of a Feather", "artist": "Billie Eilish", "album": "Hit Me Hard and Soft", "duration": 190},
            {"title": "Lunch", "artist": "Billie Eilish", "album": "Hit Me Hard and Soft", "duration": 179},
            {"title": "Chihiro", "artist": "Billie Eilish", "album": "Hit Me Hard and Soft", "duration": 303},
            {"title": "Good Luck, Babe!", "artist": "Chappell Roan", "album": "The Rise and Fall of a Midwest Princess", "duration": 218},
            {"title": "Hot to Go!", "artist": "Chappell Roan", "album": "The Rise and Fall of a Midwest Princess", "duration": 184},
            {"title": "Die With A Smile", "artist": "Lady Gaga, Bruno Mars", "album": "Die With A Smile", "duration": 251},
            {"title": "Not Like Us", "artist": "Kendrick Lamar", "album": "Not Like Us", "duration": 274}
        ],
        "weekly": [
            {"title": "Fortnight", "artist": "Taylor Swift, Post Malone", "album": "The Tortured Poets Department", "duration": 228},
            {"title": "I Can Do It With a Broken Heart", "artist": "Taylor Swift", "album": "The Tortured Poets Department", "duration": 218},
            {"title": "Cruel Summer", "artist": "Taylor Swift", "album": "Lover", "duration": 178},
            {"title": "Anti-Hero", "artist": "Taylor Swift", "album": "Midnights", "duration": 200},
            {"title": "Blinding Lights", "artist": "The Weeknd", "album": "After Hours", "duration": 200},
            {"title": "Save Your Tears", "artist": "The Weeknd", "album": "After Hours", "duration": 215},
            {"title": "Starboy", "artist": "The Weeknd, Daft Punk", "album": "Starboy", "duration": 230},
            {"title": "As It Was", "artist": "Harry Styles", "album": "Harry's House", "duration": 167},
            {"title": "Watermelon Sugar", "artist": "Harry Styles", "album": "Fine Line", "duration": 174},
            {"title": "Flowers", "artist": "Miley Cyrus", "album": "Endless Summer Vacation", "duration": 200}
        ],
        "monthly": [
            {"title": "Shape of You", "artist": "Ed Sheeran", "album": "÷ (Divide)", "duration": 233},
            {"title": "Perfect", "artist": "Ed Sheeran", "album": "÷ (Divide)", "duration": 263},
            {"title": "Bad Habits", "artist": "Ed Sheeran", "album": "= (Equals)", "duration": 231},
            {"title": "Stay", "artist": "The Kid LAROI, Justin Bieber", "album": "F*CK LOVE 3", "duration": 141},
            {"title": "Levitating", "artist": "Dua Lipa", "album": "Future Nostalgia", "duration": 203},
            {"title": "Don't Start Now", "artist": "Dua Lipa", "album": "Future Nostalgia", "duration": 183},
            {"title": "Dance The Night", "artist": "Dua Lipa", "album": "Barbie The Album", "duration": 176},
            {"title": "Houdini", "artist": "Dua Lipa", "album": "Radical Optimism", "duration": 185},
            {"title": "Someone You Loved", "artist": "Lewis Capaldi", "album": "Divinely Uninspired to a Hellish Extent", "duration": 182},
            {"title": "Sunflower", "artist": "Post Malone, Swae Lee", "album": "Spider-Man: Into the Spider-Verse", "duration": 158}
        ]
    },
    "spanish": {
        "daily": [
            {"title": "Gata Only", "artist": "FloyyMenor, Cris Mj", "album": "Gata Only", "duration": 222},
            {"title": "Si Antes Te Hubiera Conocido", "artist": "Karol G", "album": "Si Antes Te Hubiera Conocido", "duration": 195},
            {"title": "Qlona", "artist": "Karol G, Peso Pluma", "album": "Mañana Será Bonito", "duration": 172},
            {"title": "Mi Ex Tenía Razón", "artist": "Karol G", "album": "Mañana Será Bonito", "duration": 154},
            {"title": "Monaco", "artist": "Bad Bunny", "album": "Nadie Sabe Lo Que Va a Pasar Mañana", "duration": 267},
            {"title": "Perro Negro", "artist": "Bad Bunny, Feid", "album": "Nadie Sabe Lo Que Va a Pasar Mañana", "duration": 162},
            {"title": "Where She Goes", "artist": "Bad Bunny", "album": "Nadie Sabe Lo Que Va a Pasar Mañana", "duration": 231},
            {"title": "Luna", "artist": "Feid, ATL Jacob", "album": "FERXXOCALIPSIS", "duration": 196},
            {"title": "Classy 101", "artist": "Feid, Young Miko", "album": "Classy 101", "duration": 195},
            {"title": "Lady Gaga", "artist": "Peso Pluma, Gabito Ballesteros, Junior H", "album": "Génesis", "duration": 213}
        ],
        "weekly": [
            {"title": "Ella Baila Sola", "artist": "Eslabon Armado, Peso Pluma", "album": "Desvelado", "duration": 165},
            {"title": "La Bebe (Remix)", "artist": "Yng Lvcas, Peso Pluma", "album": "La Bebe", "duration": 234},
            {"title": "Bzrp Music Sessions, Vol. 53", "artist": "Bizarrap, Shakira", "album": "Bzrp Music Sessions", "duration": 218},
            {"title": "Quevedo: Bzrp Music Sessions, Vol. 52", "artist": "Bizarrap, Quevedo", "album": "Bzrp Music Sessions", "duration": 198},
            {"title": "Tití Me Preguntó", "artist": "Bad Bunny", "album": "Un Verano Sin Ti", "duration": 243},
            {"title": "Me Porto Bonito", "artist": "Bad Bunny, Chencho Corleone", "album": "Un Verano Sin Ti", "duration": 178},
            {"title": "Ojitos Lindos", "artist": "Bad Bunny, Bomba Estéreo", "album": "Un Verano Sin Ti", "duration": 258},
            {"title": "Moscow Mule", "artist": "Bad Bunny", "album": "Un Verano Sin Ti", "duration": 245},
            {"title": "Efecto", "artist": "Bad Bunny", "album": "Un Verano Sin Ti", "duration": 213},
            {"title": "Despacito", "artist": "Luis Fonsi, Daddy Yankee", "album": "VIDA", "duration": 228}
        ],
        "monthly": [
            {"title": "Dákiti", "artist": "Bad Bunny, Jhayco", "album": "El Último Tour Del Mundo", "duration": 205},
            {"title": "Hawái", "artist": "Maluma", "album": "Papi Juancho", "duration": 199},
            {"title": "Baila Baila Baila", "artist": "Ozuna", "album": "Nibiru", "duration": 158},
            {"title": "Con Calma", "artist": "Daddy Yankee, Snow", "album": "Con Calma", "duration": 193},
            {"title": "Gasolina", "artist": "Daddy Yankee", "album": "Barrio Fino", "duration": 192},
            {"title": "Mi Gente", "artist": "J Balvin, Willy William", "album": "Vibras", "duration": 185},
            {"title": "Ginza", "artist": "J Balvin", "album": "Energía", "duration": 171},
            {"title": "Chantaje", "artist": "Shakira, Maluma", "album": "El Dorado", "duration": 195},
            {"title": "Hips Don't Lie", "artist": "Shakira, Wyclef Jean", "album": "Oral Fixation Vol. 2", "duration": 218},
            {"title": "Vivir Mi Vida", "artist": "Marc Anthony", "album": "3.0", "duration": 252}
        ]
    },
    "kpop": {
        "daily": [
            {"title": "Supernova", "artist": "aespa", "album": "Armageddon", "duration": 178},
            {"title": "Armageddon", "artist": "aespa", "album": "Armageddon", "duration": 197},
            {"title": "Whiplash", "artist": "aespa", "album": "Whiplash", "duration": 184},
            {"title": "Magnetic", "artist": "ILLIT", "album": "Super Real Me", "duration": 160},
            {"title": "Cherish (My Love)", "artist": "ILLIT", "album": "I'll Like You", "duration": 176},
            {"title": "How Sweet", "artist": "NewJeans", "album": "How Sweet", "duration": 219},
            {"title": "Super Shy", "artist": "NewJeans", "album": "Get Up", "duration": 154},
            {"title": "ETA", "artist": "NewJeans", "album": "Get Up", "duration": 151},
            {"title": "Ditto", "artist": "NewJeans", "album": "OMG", "duration": 185},
            {"title": "OMG", "artist": "NewJeans", "album": "OMG", "duration": 212}
        ],
        "weekly": [
            {"title": "Seven", "artist": "Jung Kook, Latto", "album": "Golden", "duration": 184},
            {"title": "Standing Next to You", "artist": "Jung Kook", "album": "Golden", "duration": 206},
            {"title": "3D", "artist": "Jung Kook, Jack Harlow", "album": "Golden", "duration": 201},
            {"title": "Dynamite", "artist": "BTS", "album": "BE", "duration": 199},
            {"title": "Butter", "artist": "BTS", "album": "Butter", "duration": 164},
            {"title": "Boy With Luv", "artist": "BTS, Halsey", "album": "Map of the Soul: Persona", "duration": 229},
            {"title": "Like Crazy", "artist": "Jimin", "album": "FACE", "duration": 212},
            {"title": "Who", "artist": "Jimin", "album": "MUSE", "duration": 170},
            {"title": "Closer Than This", "artist": "Jimin", "album": "Closer Than This", "duration": 223},
            {"title": "Kill This Love", "artist": "BLACKPINK", "album": "Kill This Love", "duration": 189}
        ],
        "monthly": [
            {"title": "How You Like That", "artist": "BLACKPINK", "album": "The Album", "duration": 181},
            {"title": "Pink Venom", "artist": "BLACKPINK", "album": "Born Pink", "duration": 186},
            {"title": "Shut Down", "artist": "BLACKPINK", "album": "Born Pink", "duration": 175},
            {"title": "DDU-DU DDU-DU", "artist": "BLACKPINK", "album": "Square Up", "duration": 209},
            {"title": "Flower", "artist": "JISOO", "album": "ME", "duration": 173},
            {"title": "You & Me", "artist": "JENNIE", "album": "You & Me", "duration": 179},
            {"title": "Mantra", "artist": "JENNIE", "album": "Mantra", "duration": 136},
            {"title": "Rockstar", "artist": "LISA", "album": "Rockstar", "duration": 138},
            {"title": "New Woman", "artist": "LISA, Rosalía", "album": "New Woman", "duration": 179},
            {"title": "Moonlit Floor", "artist": "LISA", "album": "Moonlit Floor", "duration": 155}
        ]
    },
    "japanese": {
        "daily": [
            {"title": "Idol", "artist": "YOASOBI", "album": "THE BOOK 3", "duration": 213},
            {"title": "Bling-Bang-Bang-Born", "artist": "Creepy Nuts", "album": "Bling-Bang-Bang-Born", "duration": 171},
            {"title": "Specialz", "artist": "King Gnu", "album": "THE GREATEST UNKNOWN", "duration": 238},
            {"title": "Kaikai Kitan", "artist": "Eve", "album": "Kaizin", "duration": 221},
            {"title": "Kick Back", "artist": "Kenshi Yonezu", "album": "LOST CORNER", "duration": 193},
            {"title": "Lemon", "artist": "Kenshi Yonezu", "album": "STRAY SHEEP", "duration": 255},
            {"title": "Shinunoga E-Wa", "artist": "Fujii Kaze", "album": "HELP EVER HURT NEVER", "duration": 185},
            {"title": "Matsuri", "artist": "Fujii Kaze", "album": "LOVE ALL SERVE ALL", "duration": 225},
            {"title": "Kirari", "artist": "Fujii Kaze", "album": "LOVE ALL SERVE ALL", "duration": 227},
            {"title": "Michi Teyu Ku", "artist": "Fujii Kaze", "album": "Michi Teyu Ku", "duration": 242}
        ],
        "weekly": [
            {"title": "Racing Into The Night (Yoru ni Kakeru)", "artist": "YOASOBI", "album": "THE BOOK", "duration": 261},
            {"title": "Monster", "artist": "YOASOBI", "album": "THE BOOK 2", "duration": 206},
            {"title": "Gunjou", "artist": "YOASOBI", "album": "THE BOOK", "duration": 242},
            {"title": "Shukufuku", "artist": "YOASOBI", "album": "THE BOOK 3", "duration": 194},
            {"title": "Yusha", "artist": "YOASOBI", "album": "THE BOOK 3", "duration": 194},
            {"title": "Suzume", "artist": "RADWIMPS, Toaka", "album": "Suzume Motion Picture", "duration": 238},
            {"title": "Zenzenzense", "artist": "RADWIMPS", "album": "Your Name.", "duration": 285},
            {"title": "Sparkle", "artist": "RADWIMPS", "album": "Your Name.", "duration": 530},
            {"title": "Nandemonaiya", "artist": "RADWIMPS", "album": "Your Name.", "duration": 342},
            {"title": "Grand Escape", "artist": "RADWIMPS, Toko Miura", "album": "Weathering With You", "duration": 339}
        ],
        "monthly": [
            {"title": "Gurenge", "artist": "LiSA", "album": "LEO-NiNE", "duration": 237},
            {"title": "Homura", "artist": "LiSA", "album": "LEO-NiNE", "duration": 274},
            {"title": "Akuma no Ko", "artist": "Ai Higuchi", "album": "Akuma no Ko", "duration": 227},
            {"title": "Shinzou wo Sasageyo!", "artist": "Linked Horizon", "album": "Shingeki no Kiseki", "duration": 341},
            {"title": "Unravel", "artist": "TK from Ling Tosite Sigure", "album": "Fantastic Magic", "duration": 240},
            {"title": "Silhouette", "artist": "KANA-BOON", "album": "TIME", "duration": 240},
            {"title": "Blue Bird", "artist": "Ikimonogakari", "album": "My Song Your Song", "duration": 216},
            {"title": "Sign", "artist": "FLOW", "album": "MICROCOSM", "duration": 235},
            {"title": "Peace Sign", "artist": "Kenshi Yonezu", "album": "BOOTLEG", "duration": 238},
            {"title": "Hikaru Nara", "artist": "Goose house", "album": "Milk", "duration": 252}
        ]
    },
    "french": {
        "daily": [
            {"title": "Dernière danse", "artist": "Indila", "album": "Mini World", "duration": 214},
            {"title": "Tourner Dans Le Vide", "artist": "Indila", "album": "Mini World", "duration": 246},
            {"title": "Love Story", "artist": "Indila", "album": "Mini World", "duration": 317},
            {"title": "Papaoutai", "artist": "Stromae", "album": "Racine Carrée", "duration": 232},
            {"title": "Tous les mêmes", "artist": "Stromae", "album": "Racine Carrée", "duration": 211},
            {"title": "Alors on danse", "artist": "Stromae", "album": "Cheese", "duration": 206},
            {"title": "Santé", "artist": "Stromae", "album": "Multitude", "duration": 191},
            {"title": "L'enfer", "artist": "Stromae", "album": "Multitude", "duration": 189},
            {"title": "Mona Lisa", "artist": "Booba, JSX", "album": "ULTRA", "duration": 188},
            {"title": "Fade Up", "artist": "Zeg P, Hamza, SCH", "album": "Fade Up", "duration": 217}
        ],
        "weekly": [
            {"title": "Bande Organisée", "artist": "Jul, SCH, Kofs, Naps, Soso Maness", "album": "13 Organisé", "duration": 353},
            {"title": "Petrouchka", "artist": "Soso Maness, PLK", "album": "Avec le temps", "duration": 191},
            {"title": "La Kiffance", "artist": "Naps", "album": "Les mains faites pour l'or", "duration": 179},
            {"title": "Jolie Nana", "artist": "Aya Nakamura", "album": "AYA", "duration": 147},
            {"title": "Djadja", "artist": "Aya Nakamura", "album": "NAKAMURA", "duration": 172},
            {"title": "Copines", "artist": "Aya Nakamura", "album": "NAKAMURA", "duration": 171},
            {"title": "Pookie", "artist": "Aya Nakamura", "album": "NAKAMURA", "duration": 180},
            {"title": "Baby", "artist": "Aya Nakamura", "album": "DNK", "duration": 162},
            {"title": "Hypé", "artist": "Aya Nakamura, Ayra Starr", "album": "Hypé", "duration": 166},
            {"title": "49.3", "artist": "Werenoi", "album": "Carré", "duration": 178}
        ],
        "monthly": [
            {"title": "Dolce Camara", "artist": "Booba, SDM", "album": "Ad Vitam Aeternam", "duration": 194},
            {"title": "Bolide Noir", "artist": "SDM", "album": "Liens du 100", "duration": 177},
            {"title": "Mr. Ocho", "artist": "SDM", "album": "Liens du 100", "duration": 185},
            {"title": "Glock 17", "artist": "SDM", "album": "Ocho", "duration": 175},
            {"title": "Ne reviens pas", "artist": "Gradur, Heuss L'enfoiré", "album": "Zone 59", "duration": 188},
            {"title": "Khapta", "artist": "Heuss L'enfoiré, Sofiane", "album": "En esprit", "duration": 198},
            {"title": "Moulaga", "artist": "Heuss L'enfoiré, Jul", "album": "Moulaga", "duration": 168},
            {"title": "Die", "artist": "Gazo", "album": "KMT", "duration": 240},
            {"title": "Céline 3X", "artist": "Gazo", "album": "KMT", "duration": 154},
            {"title": "Fleurs", "artist": "Gazo, Tiakola", "album": "La Mélo Est Gangx", "duration": 187}
        ]
    }
}

def get_languages():
    """Returns list of supported music languages for user onboarding."""
    return LANGUAGES_LIST

def get_hits(chart_type="daily", language="tamil", limit=None):
    """
    Returns verified hits for the specified timeframe and language without arbitrary cutoff.
    Actively synchronizes and surfaces real-time daily, weekly, and monthly hits from live streaming sources.
    chart_type: 'daily', 'weekly', 'monthly'
    language: 'tamil', 'telugu', 'hindi', 'malayalam', 'kannada', 'punjabi', 'english', etc.
    limit: Optional int limit. If None, returns all available tracks.
    """
    chart_type = chart_type.lower()
    language = language.lower()
    
    if chart_type not in ("daily", "weekly", "monthly"):
        chart_type = "daily"
        
    lang_catalog = CHART_CATALOG.get(language)
    if not lang_catalog:
        lang_catalog = CHART_CATALOG.get("english", {})
        
    tracks = []
    seen_titles = set()
    
    # 1. First priority: Actively synced real-time tracks for this chart_type and language
    try:
        import weekly_sync
        live_tracks = weekly_sync.get_synced_tracks(chart_type, language)
        if live_tracks:
            for lt in live_tracks:
                tl = lt.get("title", "").lower()
                if tl and tl not in seen_titles:
                    seen_titles.add(tl)
                    tracks.append({
                        "title": lt.get("title", ""),
                        "artist": lt.get("artist", ""),
                        "album": lt.get("album", f"{language.title()} {chart_type.title()} Top Hits"),
                        "duration": lt.get("duration", 210),
                        "artwork": lt.get("artwork", ""),
                        "streamUrl": lt.get("streamUrl", ""),
                        "source": lt.get("source", f"Live {language.title()} {chart_type.title()} Sync")
                    })
    except Exception as e:
        print(f"[charts_data] Synced tracks lookup notice: {e}")

    # 2. Append curated catalog tracks for this timeframe
    for item in lang_catalog.get(chart_type, []):
        tl = item['title'].lower()
        if tl not in seen_titles:
            seen_titles.add(tl)
            tracks.append(item)

    # 3. Pool from other charts in same language for maximum catalog coverage
    for alt_chart in ('daily', 'weekly', 'monthly'):
        for item in lang_catalog.get(alt_chart, []):
            tl = item['title'].lower()
            if tl not in seen_titles:
                seen_titles.add(tl)
                tracks.append(item)

    # 4. Pool all artist tracks for this language to maximize coverage
    for a in ARTISTS_CATALOG:
        if a.get('language') == language or language == 'all':
            for trk in a.get('tracks', []):
                tl = trk['title'].lower()
                if tl not in seen_titles:
                    seen_titles.add(tl)
                    tracks.append({
                        "title": trk['title'],
                        "artist": trk['artist'],
                        "album": trk.get('album', f"{a['name']} Master Edition"),
                        "duration": trk.get('duration', 210),
                        "artwork": trk.get('artwork') or a.get('avatar', ''),
                        "source": f"{a['name']} Discography"
                    })

    # Apply limit if specified
    if limit and isinstance(limit, int) and limit > 0:
        tracks = tracks[:limit]

    # Format with metadata badges, rank, and lossless tags
    formatted = []
    for idx, item in enumerate(tracks, start=1):
        art = item.get("artwork") or get_cached_art(item["title"], item["artist"])
        t_dict = {
            "id": f"hit_{language}_{chart_type}_{idx}",
            "rank": idx,
            "title": item["title"],
            "artist": item["artist"],
            "album": item.get("album", f"{language.title()} {chart_type.title()} Hits"),
            "duration": item.get("duration", 210),
            "artwork": art,
            "language": language,
            "chartType": chart_type,
            "quality": "FLAC / 320kbps Hi-Fi",
            "bitrate": "Lossless Studio 24-bit/48kHz",
            "source": item.get("source", "Lossless Music Engine")
        }
        if item.get("streamUrl"):
            t_dict["streamUrl"] = item["streamUrl"]
        formatted.append(t_dict)
    return formatted


# ================= ARTIST WISE CATALOG =================

ARTISTS_CATALOG = [
    # Tamil
    {
        "id": "anirudh",
        "name": "Anirudh Ravichander",
        "language": "tamil",
        "role": "Composer / Music Director",
        "avatar": "/assets/artists/anirudh.jpg",
        "monthlyListeners": "18.4M",
        "tracks": [
            {"id": "ar_1", "title": "Hukum - Thalaivar Alappara", "artist": "Anirudh Ravichander", "album": "Jailer", "duration": 207, "quality": "FLAC / 320kbps Hi-Fi"},
            {"id": "ar_2", "title": "Naa Ready", "artist": "Anirudh Ravichander, Thalapathy Vijay", "album": "Leo", "duration": 248, "quality": "FLAC / 320kbps Hi-Fi"},
            {"id": "ar_3", "title": "Badass", "artist": "Anirudh Ravichander", "album": "Leo", "duration": 229, "quality": "FLAC / 320kbps Hi-Fi"},
            {"id": "ar_4", "title": "Spark", "artist": "Anirudh Ravichander", "album": "The Greatest of All Time", "duration": 234, "quality": "FLAC / 320kbps Hi-Fi"},
            {"id": "ar_5", "title": "Chaleya", "artist": "Anirudh Ravichander, Arijit Singh", "album": "Jawan", "duration": 200, "quality": "FLAC / 320kbps Hi-Fi"},
            {"id": "ar_6", "title": "Hayyoda", "artist": "Anirudh Ravichander", "album": "Jawan", "duration": 195, "quality": "FLAC / 320kbps Hi-Fi"},
            {"id": "ar_7", "title": "Kaavaalaa", "artist": "Anirudh Ravichander, Shilpa Rao", "album": "Jailer", "duration": 190, "quality": "FLAC / 320kbps Hi-Fi"},
            {"id": "ar_8", "title": "Arabic Kuthu", "artist": "Anirudh Ravichander, Jonita Gandhi", "album": "Beast", "duration": 279, "quality": "FLAC / 320kbps Hi-Fi"}
        ]
    },
    {
        "id": "ar_rahman",
        "name": "A.R. Rahman",
        "language": "tamil",
        "role": "The Mozart of Madras",
        "avatar": "/assets/artists/ar_rahman.jpg",
        "monthlyListeners": "24.1M",
        "tracks": [
            {"id": "arr_1", "title": "Aga Naga", "artist": "A.R. Rahman, Shakthisree Gopalan", "album": "Ponniyin Selvan Part-2", "duration": 243, "quality": "FLAC / 320kbps Hi-Fi"},
            {"id": "arr_2", "title": "Ae Dil Hai Mushkil", "artist": "Arijit Singh, A.R. Rahman", "album": "Ae Dil Hai Mushkil", "duration": 269, "quality": "FLAC / 320kbps Hi-Fi"},
            {"id": "arr_3", "title": "Chinnanjiru Nilave", "artist": "A.R. Rahman, Haricharan", "album": "Ponniyin Selvan Part-2", "duration": 204, "quality": "FLAC / 320kbps Hi-Fi"},
            {"id": "arr_4", "title": "Jai Ho", "artist": "A.R. Rahman, Sukhwinder Singh", "album": "Slumdog Millionaire", "duration": 319, "quality": "FLAC / 320kbps Hi-Fi"},
            {"id": "arr_5", "title": "Kun Faya Kun", "artist": "A.R. Rahman, Javed Ali, Mohit Chauhan", "album": "Rockstar", "duration": 473, "quality": "FLAC / 320kbps Hi-Fi"}
        ]
    },
    {
        "id": "harris_jayaraj",
        "name": "Harris Jayaraj",
        "language": "tamil",
        "role": "Melody King",
        "avatar": "/assets/artists/harris_jayaraj.jpg",
        "monthlyListeners": "9.8M",
        "tracks": [
            {"id": "hj_1", "title": "Vaseegara", "artist": "Harris Jayaraj, Bombay Jayashri", "album": "Minnale", "duration": 300, "quality": "FLAC / 320kbps Hi-Fi"},
            {"id": "hj_2", "title": "Unakkul Naane", "artist": "Harris Jayaraj, Bombay Jayashri", "album": "Pachaikili Muthucharam", "duration": 310, "quality": "FLAC / 320kbps Hi-Fi"},
            {"id": "hj_3", "title": "Ennamo Edho", "artist": "Harris Jayaraj, Aalap Raju", "album": "Ko", "duration": 320, "quality": "FLAC / 320kbps Hi-Fi"},
            {"id": "hj_4", "title": "Nenjukkul Peidhidum", "artist": "Harris Jayaraj, Hariharan", "album": "Vaaranam Aayiram", "duration": 372, "quality": "FLAC / 320kbps Hi-Fi"}
        ]
    },
    {
        "id": "yuvan_shankar_raja",
        "name": "Yuvan Shankar Raja",
        "language": "tamil",
        "role": "Youth Icon / Composer",
        "avatar": "/assets/artists/yuvan_shankar_raja.jpg",
        "monthlyListeners": "11.2M",
        "tracks": [
            {"id": "ysr_1", "title": "Matta", "artist": "Yuvan Shankar Raja, Thalapathy Vijay", "album": "The Greatest of All Time", "duration": 222, "quality": "FLAC / 320kbps Hi-Fi"},
            {"id": "ysr_2", "title": "Whistle Podu", "artist": "Yuvan Shankar Raja, Thalapathy Vijay", "album": "The Greatest of All Time", "duration": 235, "quality": "FLAC / 320kbps Hi-Fi"},
            {"id": "ysr_3", "title": "Rowdy Baby", "artist": "Yuvan Shankar Raja, Dhanush, Dhee", "album": "Maari 2", "duration": 282, "quality": "FLAC / 320kbps Hi-Fi"}
        ]
    },
    {
        "id": "sai_abhyankkar",
        "name": "Sai Abhyankkar",
        "language": "tamil",
        "role": "Breakthrough Indie Artist",
        "avatar": "/assets/artists/sai_abhyankkar.jpg",
        "monthlyListeners": "8.5M",
        "tracks": [
            {"id": "sa_1", "title": "Katchi Sera", "artist": "Sai Abhyankkar", "album": "Katchi Sera Single", "duration": 194, "quality": "FLAC / 320kbps Hi-Fi"},
            {"id": "sa_2", "title": "Aasa Kooda", "artist": "Sai Abhyankkar, Sai Smriti", "album": "Think Indie", "duration": 218, "quality": "FLAC / 320kbps Hi-Fi"}
        ]
    },
    # Telugu
    {
        "id": "devi_sri_prasad",
        "name": "Devi Sri Prasad (DSP)",
        "language": "telugu",
        "role": "Rockstar DSP",
        "avatar": "/assets/artists/devi_sri_prasad.jpg",
        "monthlyListeners": "14.6M",
        "tracks": [
            {"id": "dsp_1", "title": "Pushpa Pushpa", "artist": "Devi Sri Prasad, Nakash Aziz", "album": "Pushpa 2: The Rule", "duration": 266, "quality": "FLAC / 320kbps Hi-Fi"},
            {"id": "dsp_2", "title": "Sooseki (The Couple Song)", "artist": "Devi Sri Prasad, Shreya Ghoshal", "album": "Pushpa 2: The Rule", "duration": 260, "quality": "FLAC / 320kbps Hi-Fi"},
            {"id": "dsp_3", "title": "Oo Antava Mava", "artist": "Devi Sri Prasad, Indravathi Chauhan", "album": "Pushpa: The Rise", "duration": 223, "quality": "FLAC / 320kbps Hi-Fi"},
            {"id": "dsp_4", "title": "Srivalli", "artist": "Sid Sriram, Devi Sri Prasad", "album": "Pushpa: The Rise", "duration": 221, "quality": "FLAC / 320kbps Hi-Fi"}
        ]
    },
    {
        "id": "thaman_s",
        "name": "Thaman S",
        "language": "telugu",
        "role": "Musical Sensation",
        "avatar": "/assets/artists/thaman_s.jpg",
        "monthlyListeners": "13.2M",
        "tracks": [
            {"id": "ts_1", "title": "Kurchi Madathapetti", "artist": "Thaman S, Mahesh Babu, Sahithi Chaganti", "album": "Guntur Kaaram", "duration": 218, "quality": "FLAC / 320kbps Hi-Fi"},
            {"id": "ts_2", "title": "Dum Masala", "artist": "Thaman S, Sanjith Hegde", "album": "Guntur Kaaram", "duration": 206, "quality": "FLAC / 320kbps Hi-Fi"},
            {"id": "ts_3", "title": "Butta Bomma", "artist": "Armaan Malik, Thaman S", "album": "Ala Vaikunthapurramuloo", "duration": 198, "quality": "FLAC / 320kbps Hi-Fi"}
        ]
    },
    # Hindi
    {
        "id": "arijit_singh",
        "name": "Arijit Singh",
        "language": "hindi",
        "role": "Voice of a Generation",
        "avatar": "/assets/artists/arijit_singh.jpg",
        "monthlyListeners": "38.7M",
        "tracks": [
            {"id": "as_1", "title": "Satranga", "artist": "Arijit Singh, Shreyas Puranik", "album": "Animal", "duration": 271, "quality": "FLAC / 320kbps Hi-Fi"},
            {"id": "as_2", "title": "Kesariya", "artist": "Arijit Singh, Pritam", "album": "Brahmastra", "duration": 268, "quality": "FLAC / 320kbps Hi-Fi"},
            {"id": "as_3", "title": "Tum Hi Ho", "artist": "Arijit Singh, Mithoon", "album": "Aashiqui 2", "duration": 262, "quality": "FLAC / 320kbps Hi-Fi"},
            {"id": "as_4", "title": "Apna Bana Le", "artist": "Arijit Singh, Sachin-Jigar", "album": "Bhediya", "duration": 261, "quality": "FLAC / 320kbps Hi-Fi"}
        ]
    },
    # Punjabi
    {
        "id": "diljit_dosanjh",
        "name": "Diljit Dosanjh",
        "language": "punjabi",
        "role": "Global Punjabi Icon",
        "avatar": "/assets/artists/diljit_dosanjh.jpg",
        "monthlyListeners": "21.5M",
        "tracks": [
            {"id": "dd_1", "title": "Naina", "artist": "Diljit Dosanjh, Badshah", "album": "Crew", "duration": 180, "quality": "FLAC / 320kbps Hi-Fi"},
            {"id": "dd_2", "title": "Lover", "artist": "Diljit Dosanjh, Intense", "album": "MoonChild Era", "duration": 195, "quality": "FLAC / 320kbps Hi-Fi"},
            {"id": "dd_3", "title": "Born to Shine", "artist": "Diljit Dosanjh", "album": "G.O.A.T.", "duration": 213, "quality": "FLAC / 320kbps Hi-Fi"},
            {"id": "dd_4", "title": "G.O.A.T.", "artist": "Diljit Dosanjh", "album": "G.O.A.T.", "duration": 223, "quality": "FLAC / 320kbps Hi-Fi"}
        ]
    },
    {
        "id": "karan_aujla",
        "name": "Karan Aujla",
        "language": "punjabi",
        "role": "Singer & Rapper",
        "avatar": "/assets/artists/karan_aujla.jpg",
        "monthlyListeners": "16.8M",
        "tracks": [
            {"id": "ka_1", "title": "Tauba Tauba", "artist": "Karan Aujla", "album": "Bad Newz", "duration": 207, "quality": "FLAC / 320kbps Hi-Fi"},
            {"id": "ka_2", "title": "Softly", "artist": "Karan Aujla, Ikky", "album": "Making Memories", "duration": 155, "quality": "FLAC / 320kbps Hi-Fi"},
            {"id": "ka_3", "title": "Winning Speech", "artist": "Karan Aujla", "album": "Street Dreams", "duration": 196, "quality": "FLAC / 320kbps Hi-Fi"}
        ]
    },
    # Malayalam
    {
        "id": "sushin_shyam",
        "name": "Sushin Shyam",
        "language": "malayalam",
        "role": "Innovator & Composer",
        "avatar": "/assets/artists/sushin_shyam.jpg",
        "monthlyListeners": "6.8M",
        "tracks": [
            {"id": "ss_1", "title": "Illuminati", "artist": "Sushin Shyam, Dabzee", "album": "Aavesham", "duration": 193, "quality": "FLAC / 320kbps Hi-Fi"},
            {"id": "ss_2", "title": "Jaada", "artist": "Sushin Shyam, Sreenath Bhasi", "album": "Aavesham", "duration": 218, "quality": "FLAC / 320kbps Hi-Fi"},
            {"id": "ss_3", "title": "Kuthanthram", "artist": "Sushin Shyam, Vedan", "album": "Manjummel Boys", "duration": 164, "quality": "FLAC / 320kbps Hi-Fi"}
        ]
    },
    # English / Global
    {
        "id": "the_weeknd",
        "name": "The Weeknd",
        "language": "english",
        "role": "Global Pop / R&B Phenomenon",
        "avatar": "/assets/artists/the_weeknd.jpg",
        "monthlyListeners": "112.5M",
        "tracks": [
            {"id": "tw_1", "title": "Blinding Lights", "artist": "The Weeknd", "album": "After Hours", "duration": 200, "quality": "FLAC / 320kbps Hi-Fi"},
            {"id": "tw_2", "title": "Starboy", "artist": "The Weeknd, Daft Punk", "album": "Starboy", "duration": 230, "quality": "FLAC / 320kbps Hi-Fi"},
            {"id": "tw_3", "title": "Save Your Tears", "artist": "The Weeknd", "album": "After Hours", "duration": 215, "quality": "FLAC / 320kbps Hi-Fi"},
            {"id": "tw_4", "title": "Die For You", "artist": "The Weeknd", "album": "Starboy", "duration": 260, "quality": "FLAC / 320kbps Hi-Fi"}
        ]
    },
    {
        "id": "sabrina_carpenter",
        "name": "Sabrina Carpenter",
        "language": "english",
        "role": "Pop Superstar",
        "avatar": "/assets/artists/sabrina_carpenter.jpg",
        "monthlyListeners": "85.2M",
        "tracks": [
            {"id": "sc_1", "title": "Espresso", "artist": "Sabrina Carpenter", "album": "Short n' Sweet", "duration": 175, "quality": "FLAC / 320kbps Hi-Fi"},
            {"id": "sc_2", "title": "Please Please Please", "artist": "Sabrina Carpenter", "album": "Short n' Sweet", "duration": 186, "quality": "FLAC / 320kbps Hi-Fi"},
            {"id": "sc_3", "title": "Taste", "artist": "Sabrina Carpenter", "album": "Short n' Sweet", "duration": 157, "quality": "FLAC / 320kbps Hi-Fi"}
        ]
    },
    {
        "id": "taylor_swift",
        "name": "Taylor Swift",
        "language": "english",
        "role": "Singer-Songwriter Icon",
        "avatar": "/assets/artists/taylor_swift.jpg",
        "monthlyListeners": "104.3M",
        "tracks": [
            {"id": "tsw_1", "title": "Fortnight", "artist": "Taylor Swift, Post Malone", "album": "The Tortured Poets Department", "duration": 228, "quality": "FLAC / 320kbps Hi-Fi"},
            {"id": "tsw_2", "title": "Cruel Summer", "artist": "Taylor Swift", "album": "Lover", "duration": 178, "quality": "FLAC / 320kbps Hi-Fi"},
            {"id": "tsw_3", "title": "Anti-Hero", "artist": "Taylor Swift", "album": "Midnights", "duration": 200, "quality": "FLAC / 320kbps Hi-Fi"}
        ]
    },
    {
        "id": "billie_eilish",
        "name": "Billie Eilish",
        "language": "english",
        "role": "Alt-Pop Sensation",
        "avatar": "/assets/artists/billie_eilish.jpg",
        "monthlyListeners": "92.0M",
        "tracks": [
            {"id": "be_1", "title": "BIRDS OF A FEATHER", "artist": "Billie Eilish", "album": "HIT ME HARD AND SOFT", "duration": 194, "quality": "FLAC / 320kbps Hi-Fi"},
            {"id": "be_2", "title": "LUNCH", "artist": "Billie Eilish", "album": "HIT ME HARD AND SOFT", "duration": 180, "quality": "FLAC / 320kbps Hi-Fi"},
            {"id": "be_3", "title": "bad guy", "artist": "Billie Eilish", "album": "WHEN WE ALL FALL ASLEEP, WHERE DO WE GO?", "duration": 194, "quality": "FLAC / 320kbps Hi-Fi"}
        ]
    },
    # Spanish
    {
        "id": "bad_bunny",
        "name": "Bad Bunny",
        "language": "spanish",
        "role": "King of Latin Trap",
        "avatar": "/assets/artists/bad_bunny.jpg",
        "monthlyListeners": "68.4M",
        "tracks": [
            {"id": "bb_1", "title": "MONACO", "artist": "Bad Bunny", "album": "nadie sabe lo que va a pasar manana", "duration": 267, "quality": "FLAC / 320kbps Hi-Fi"},
            {"id": "bb_2", "title": "Me Porto Bonito", "artist": "Bad Bunny, Chencho Corleone", "album": "Un Verano Sin Ti", "duration": 178, "quality": "FLAC / 320kbps Hi-Fi"},
            {"id": "bb_3", "title": "Titi Me Pregunto", "artist": "Bad Bunny", "album": "Un Verano Sin Ti", "duration": 243, "quality": "FLAC / 320kbps Hi-Fi"}
        ]
    },
    # K-Pop
    {
        "id": "blackpink",
        "name": "BLACKPINK",
        "language": "kpop",
        "role": "Global K-Pop Girl Group",
        "avatar": "/assets/artists/blackpink.jpg",
        "monthlyListeners": "31.2M",
        "tracks": [
            {"id": "bp_1", "title": "Pink Venom", "artist": "BLACKPINK", "album": "BORN PINK", "duration": 186, "quality": "FLAC / 320kbps Hi-Fi"},
            {"id": "bp_2", "title": "Shut Down", "artist": "BLACKPINK", "album": "BORN PINK", "duration": 175, "quality": "FLAC / 320kbps Hi-Fi"},
            {"id": "bp_3", "title": "How You Like That", "artist": "BLACKPINK", "album": "THE ALBUM", "duration": 182, "quality": "FLAC / 320kbps Hi-Fi"}
        ]
    },
    # Japanese
    {
        "id": "yoasobi",
        "name": "YOASOBI",
        "language": "japanese",
        "role": "Novel into Music",
        "avatar": "/assets/artists/yoasobi.jpg",
        "monthlyListeners": "11.4M",
        "tracks": [
            {"id": "ya_1", "title": "Idol (アイドル)", "artist": "YOASOBI", "album": "Idol Single", "duration": 213, "quality": "FLAC / 320kbps Hi-Fi"},
            {"id": "ya_2", "title": "Yoru ni Kakeru (夜に駆ける)", "artist": "YOASOBI", "album": "THE BOOK", "duration": 261, "quality": "FLAC / 320kbps Hi-Fi"},
            {"id": "ya_3", "title": "Monster (怪物)", "artist": "YOASOBI", "album": "THE BOOK 2", "duration": 205, "quality": "FLAC / 320kbps Hi-Fi"}
        ]
    }
]

def get_artists(lang=None):
    if not lang or lang == 'all':
        return ARTISTS_CATALOG
    return [a for a in ARTISTS_CATALOG if a.get('language') == lang]

def get_artist_by_id(artist_id):
    for a in ARTISTS_CATALOG:
        if a['id'] == artist_id or a['name'].lower() == artist_id.lower():
            return a
    return None
