# Cambridge Learning Services | Examination & Assessment Portal

Official online examination and candidate management platform for **Cambridge Learning Services**.

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Variables
Create a `.env` file in the project root with your Supabase credentials:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Database Setup (1-Click SQL)
To create a clean, identical database in Supabase:
1. Open your **Supabase Dashboard** -> **SQL Editor**.
2. Open [`CAMBRIDGE_LEARNING_SERVICES_MASTER.sql`](file:///c:/Users/Iron%20Man/Downloads/Examportal/PMIS-main/CAMBRIDGE_LEARNING_SERVICES_MASTER.sql) (or [`master_database.sql`](file:///c:/Users/Iron%20Man/Downloads/Examportal/PMIS-main/master_database.sql)).
3. Copy and paste the entire script into the SQL editor and click **Run**.
4. The script automatically sets up:
   - All tables (`profiles`, `exams`, `questions`, `submissions`, `admissions`)
   - Storage buckets (`aadhaar_cards`, `candidate_documents`) and public access policies
   - Row Level Security (RLS) policies
   - Helper & RPC functions (`create_candidate`, `create_user_from_admission`, `delete_user_by_id`)
   - Identity repair & Super Admin account (`kabirhaldar4444@gmail.com` / `123456`)

### 4. Run Locally
```bash
npm run dev
```

### 5. Build for Production
```bash
npm run build
```

---

## 🎨 Branding & Theme
- **Primary Brand Color**: Cambridge Forest Green (`#0D4A38`, `#126E51`)
- **Secondary Accent**: Warm Terracotta / Cinnamon Copper (`#BA6438`)
- **Logo File**: `src/assets/images/Cambridge-Learning-Services.png` & `public/favicon.png`
- **Favicon**: High-DPI browser tab icon in `public/favicon.svg` and `public/favicon.png`
