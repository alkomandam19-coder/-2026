const { createClient } = require("@supabase/supabase-js");
const supabaseUrl = "https://qphaspuinxldwjijwyrf.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwaGFzcHVpbnhsZHdqaWp3eXJmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODUzNjY5OCwiZXhwIjoyMTA0MTEyNjk4fQ.GZb9S4wVUjjgoGidSBEcjB4lt_opu56dR6ab1Vy8gGg";
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.from("site_configs").select("*");
  if (error) {
    console.error("Error:", error);
    return;
  }
  console.log("Config keys in Supabase:", data.map(d => d.key));
  const news = data.find(d => d.key === "custom_news_posts_v1");
  if (news) {
    console.log("News value:", JSON.stringify(news.value, null, 2));
  } else {
    console.log("No custom_news_posts_v1 row");
  }
}
check();
