#!/bin/bash
# deploy-reminders.sh
# Script untuk deploy Edge Function ke Supabase
# Jalankan dari root folder project: bash deploy-reminders.sh

echo "🚀 Deploying send-deadline-reminders edge function..."

# Pastikan Supabase CLI sudah terinstall
if ! command -v supabase &> /dev/null; then
  echo "❌ Supabase CLI belum terinstall."
  echo "   Install: npm install -g supabase"
  exit 1
fi

# Login (skip jika sudah)
supabase login

# Deploy function
supabase functions deploy send-deadline-reminders --no-verify-jwt

echo ""
echo "✅ Deploy selesai!"
echo ""
echo "📋 Langkah selanjutnya:"
echo "   1. Set secret RESEND_API_KEY di Supabase Dashboard"
echo "      → Settings > Edge Functions > Secrets"
echo "   2. Jalankan supabase/setup-cron.sql di SQL Editor"
echo "   3. Test manual via Dashboard > Edge Functions > Invoke"
