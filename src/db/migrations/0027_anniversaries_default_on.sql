-- =====================================================================
-- 0027_anniversaries_default_on.sql — anniversaries push default ON
--
-- Anterior, push_anniversaries era opt-in (default false). Decizie de
-- produs: e o re-conectare emoțională valoroasă (BLUEPRINT calm
-- collaboration), nu presiune.
--
-- Schimbăm default-ul la true. Pentru useri viitori, kicks in la primul
-- INSERT. Pentru rândurile existente respect-uim alegerea explicită
-- a userului — nu suprascriem.
-- =====================================================================

alter table public.notification_preferences
  alter column push_anniversaries set default true;
