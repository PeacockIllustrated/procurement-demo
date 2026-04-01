import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export async function submitLead(data: {
  businessName: string;
  primaryColour: string;
  darkColour: string;
  wordmarkLogo: string;
  iconLogo: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
}) {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn("Lead capture: Supabase not configured");
    return { success: false };
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const { error } = await supabase.from("demo_leads").insert({
    business_name: data.businessName,
    primary_colour: data.primaryColour,
    dark_colour: data.darkColour,
    wordmark_logo: data.wordmarkLogo,
    icon_logo: data.iconLogo,
    contact_name: data.contactName,
    contact_email: data.contactEmail,
    contact_phone: data.contactPhone,
  });

  if (error) {
    console.error("Lead capture error:", error);
    return { success: false };
  }
  return { success: true };
}
