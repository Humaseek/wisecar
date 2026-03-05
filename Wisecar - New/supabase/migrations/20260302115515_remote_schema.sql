


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."car_status" AS ENUM (
    'available',
    'reserved',
    'sold'
);


ALTER TYPE "public"."car_status" OWNER TO "postgres";


CREATE TYPE "public"."payment_method" AS ENUM (
    'cash',
    'bank_transfer',
    'credit_card',
    'check',
    'other'
);


ALTER TYPE "public"."payment_method" OWNER TO "postgres";


CREATE TYPE "public"."user_role" AS ENUM (
    'admin',
    'sales'
);


ALTER TYPE "public"."user_role" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cars_count_by_status"("target" "public"."car_status") RETURNS TABLE("count" bigint)
    LANGUAGE "sql" STABLE
    AS $$
  select count(*)::bigint
  from public.cars
  where status = target;
$$;


ALTER FUNCTION "public"."cars_count_by_status"("target" "public"."car_status") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  insert into public.profiles (id, role, full_name)
  values (new.id, 'sales', coalesce(new.raw_user_meta_data->>'full_name', null))
  on conflict (id) do nothing;
  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;


ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_sales"() RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'sales'
  );
$$;


ALTER FUNCTION "public"."is_sales"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_car_sold"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  update public.cars
  set status = 'sold',
      sold_at = now(),
      sold_sale_id = new.id,
      updated_by = auth.uid()
  where id = new.car_id;

  return new;
end;
$$;


ALTER FUNCTION "public"."mark_car_sold"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."profit_sum_total"() RETURNS numeric
    LANGUAGE "plpgsql" STABLE
    AS $$
declare
  v_total numeric;
begin
  if not public.is_admin() then
    return 0::numeric;
  end if;

  select coalesce(sum(s.sold_price),0)
         - coalesce(sum(cf.purchase_price + cf.ads_cost + cf.fuel_cost + cf.other_cost),0)
    into v_total
  from public.sales s
  left join public.car_finance cf on cf.car_id = s.car_id;

  return coalesce(v_total,0)::numeric;
end;
$$;


ALTER FUNCTION "public"."profit_sum_total"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sales_sum_this_month"() RETURNS numeric
    LANGUAGE "sql" STABLE
    AS $$
  select coalesce(sum(s.sold_price), 0)::numeric
  from public.sales s
  where date_trunc('month', s.sale_date::timestamptz) = date_trunc('month', now());
$$;


ALTER FUNCTION "public"."sales_sum_this_month"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sales_sum_total"() RETURNS numeric
    LANGUAGE "sql" STABLE
    AS $$
  select coalesce(sum(sold_price), 0)::numeric
  from public.sales;
$$;


ALTER FUNCTION "public"."sales_sum_total"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_car_finance_compat"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  if new.ads_cost is null and new.ad_spend is not null then
    new.ads_cost := new.ad_spend;
  end if;

  if new.ad_spend is null and new.ads_cost is not null then
    new.ad_spend := new.ads_cost;
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."sync_car_finance_compat"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_car_images_compat"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  if new.storage_path is null and new.path is not null then
    new.storage_path := new.path;
  end if;

  if new.path is null and new.storage_path is not null then
    new.path := new.storage_path;
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."sync_car_images_compat"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_cars_compat"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  -- type <-> car_type
  if new.car_type is null and new."type" is not null then
    new.car_type := new."type";
  end if;

  if new."type" is null and new.car_type is not null then
    new."type" := new.car_type;
  end if;

  -- description <-> notes_public
  if new.notes_public is null and new.description is not null then
    new.notes_public := new.description;
  end if;

  if new.description is null and new.notes_public is not null then
    new.description := new.notes_public;
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."sync_cars_compat"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_cars_type"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  if new.car_type is null and new."type" is not null then
    new.car_type := new."type";
  end if;

  if new."type" is null and new.car_type is not null then
    new."type" := new.car_type;
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."sync_cars_type"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."unmark_car_sold"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  update public.cars
  set status = 'available',
      sold_at = null,
      sold_sale_id = null,
      updated_by = auth.uid()
  where id = old.car_id and sold_sale_id = old.id;

  return old;
end;
$$;


ALTER FUNCTION "public"."unmark_car_sold"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."car_details" (
    "car_id" "uuid" NOT NULL,
    "on_road_date" "date",
    "trim_level" "text",
    "last_test_date" "date",
    "test_valid_until" "date",
    "ownership_type" "text",
    "chassis_no" "text",
    "ministry_code" "text",
    "model_code" "text",
    "registration_instruction" "text",
    "engine_number" "text",
    "importer_name" "text",
    "price_on_road" numeric(12,2),
    "gas_installed" boolean,
    "color_changed" boolean,
    "ownership_changed" boolean,
    "engine_model" "text",
    "fuel_type" "text",
    "tire_front" "text",
    "tire_rear" "text",
    "emission_group" integer,
    "gearbox" "text",
    "body_type" "text",
    "registration_group" "text",
    "engine_cc" integer,
    "horsepower" integer,
    "euro_standard" "text",
    "drive_type" "text",
    "drive_tech" "text",
    "electric_windows_count" integer,
    "sunroof" boolean,
    "alloy_wheels" boolean,
    "tire_pressure_sensors" boolean,
    "reverse_camera" boolean,
    "doors_count" integer,
    "seats_count" integer,
    "total_weight" integer,
    "tow_no_brakes" integer,
    "tow_with_brakes" integer,
    "airbags_count" integer,
    "abs" boolean,
    "stability_control" boolean,
    "lane_departure_warning" boolean,
    "distance_monitor" boolean,
    "adaptive_cruise" boolean,
    "disabled_tag" boolean,
    "ownership_history" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "owners_count" integer
);


ALTER TABLE "public"."car_details" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."car_finance" (
    "car_id" "uuid" NOT NULL,
    "purchase_price" numeric(12,2) DEFAULT 0 NOT NULL,
    "ads_cost" numeric(12,2) DEFAULT 0 NOT NULL,
    "fuel_cost" numeric(12,2) DEFAULT 0 NOT NULL,
    "other_cost" numeric(12,2) DEFAULT 0 NOT NULL,
    "purchase_date" "date",
    "internal_notes" "text",
    "supplier_id" "uuid",
    "created_by" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ad_spend" numeric(12,2)
);


ALTER TABLE "public"."car_finance" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."car_images" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "car_id" "uuid" NOT NULL,
    "storage_path" "text" NOT NULL,
    "is_primary" boolean DEFAULT false NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_by" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "path" "text",
    "public_url" "text"
);


ALTER TABLE "public"."car_images" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."car_makes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."car_makes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."car_models" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "make_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."car_models" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cars" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "stock_no" "text",
    "plate_number" "text",
    "vin" "text",
    "make" "text" NOT NULL,
    "model" "text" NOT NULL,
    "car_type" "text" NOT NULL,
    "year" integer,
    "color" "text",
    "mileage" integer,
    "status" "public"."car_status" DEFAULT 'available'::"public"."car_status" NOT NULL,
    "asking_price" numeric(12,2) DEFAULT 0 NOT NULL,
    "notes_public" "text",
    "sold_at" timestamp with time zone,
    "sold_sale_id" "uuid",
    "created_by" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "updated_by" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "type" "text",
    "description" "text",
    "main_image_url" "text"
);


ALTER TABLE "public"."cars" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."customers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "full_name" "text" NOT NULL,
    "national_id" "text",
    "phone" "text",
    "email" "text",
    "city" "text",
    "notes" "text",
    "created_by" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."customers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "role" "public"."user_role" DEFAULT 'sales'::"public"."user_role" NOT NULL,
    "full_name" "text",
    "phone" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sales" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "car_id" "uuid" NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "sold_price" numeric(12,2) NOT NULL,
    "payment_method" "public"."payment_method" DEFAULT 'other'::"public"."payment_method" NOT NULL,
    "sale_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "notes" "text",
    "created_by" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."sales" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."sales_list_view" AS
 SELECT "s"."id",
    "c"."sold_at",
    "s"."sold_price",
    "s"."payment_method",
    TRIM(BOTH FROM "concat_ws"(' '::"text", "c"."make", "c"."model",
        CASE
            WHEN ("c"."year" IS NULL) THEN NULL::"text"
            ELSE ("c"."year")::"text"
        END)) AS "car_title",
    "cu"."full_name" AS "customer_name",
    "s"."created_by" AS "salesperson_id",
    "p"."full_name" AS "sales_user_name",
    "p"."full_name" AS "salesperson_name"
   FROM ((("public"."sales" "s"
     JOIN "public"."cars" "c" ON (("c"."id" = "s"."car_id")))
     JOIN "public"."customers" "cu" ON (("cu"."id" = "s"."customer_id")))
     LEFT JOIN "public"."profiles" "p" ON (("p"."id" = "s"."created_by")));


ALTER VIEW "public"."sales_list_view" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."suppliers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "phone" "text",
    "email" "text",
    "city" "text",
    "notes" "text",
    "created_by" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "company" "text" NOT NULL
);


ALTER TABLE "public"."suppliers" OWNER TO "postgres";


ALTER TABLE ONLY "public"."car_details"
    ADD CONSTRAINT "car_details_pkey" PRIMARY KEY ("car_id");



ALTER TABLE ONLY "public"."car_finance"
    ADD CONSTRAINT "car_finance_pkey" PRIMARY KEY ("car_id");



ALTER TABLE ONLY "public"."car_images"
    ADD CONSTRAINT "car_images_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."car_makes"
    ADD CONSTRAINT "car_makes_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."car_makes"
    ADD CONSTRAINT "car_makes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."car_models"
    ADD CONSTRAINT "car_models_make_id_name_key" UNIQUE ("make_id", "name");



ALTER TABLE ONLY "public"."car_models"
    ADD CONSTRAINT "car_models_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cars"
    ADD CONSTRAINT "cars_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cars"
    ADD CONSTRAINT "cars_stock_no_key" UNIQUE ("stock_no");



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sales"
    ADD CONSTRAINT "sales_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."suppliers"
    ADD CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_car_images_car" ON "public"."car_images" USING "btree" ("car_id");



CREATE INDEX "idx_car_images_primary" ON "public"."car_images" USING "btree" ("car_id", "is_primary");



CREATE INDEX "idx_car_models_make_id" ON "public"."car_models" USING "btree" ("make_id");



CREATE INDEX "idx_cars_asking_price" ON "public"."cars" USING "btree" ("asking_price");



CREATE INDEX "idx_cars_make" ON "public"."cars" USING "btree" ("make");



CREATE INDEX "idx_cars_status" ON "public"."cars" USING "btree" ("status");



CREATE INDEX "idx_cars_type" ON "public"."cars" USING "btree" ("car_type");



CREATE INDEX "idx_customers_name" ON "public"."customers" USING "btree" ("full_name");



CREATE INDEX "idx_customers_phone" ON "public"."customers" USING "btree" ("phone");



CREATE INDEX "idx_sales_created_by" ON "public"."sales" USING "btree" ("created_by");



CREATE INDEX "idx_sales_sale_date" ON "public"."sales" USING "btree" ("sale_date");



CREATE INDEX "idx_suppliers_company" ON "public"."suppliers" USING "btree" ("company");



CREATE INDEX "idx_suppliers_name" ON "public"."suppliers" USING "btree" ("name");



CREATE UNIQUE INDEX "uq_sales_car_id" ON "public"."sales" USING "btree" ("car_id");



CREATE OR REPLACE TRIGGER "trg_car_details_updated_at" BEFORE UPDATE ON "public"."car_details" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_car_finance_updated_at" BEFORE UPDATE ON "public"."car_finance" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_cars_updated_at" BEFORE UPDATE ON "public"."cars" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_customers_updated_at" BEFORE UPDATE ON "public"."customers" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_mark_car_sold" AFTER INSERT ON "public"."sales" FOR EACH ROW EXECUTE FUNCTION "public"."mark_car_sold"();



CREATE OR REPLACE TRIGGER "trg_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_suppliers_updated_at" BEFORE UPDATE ON "public"."suppliers" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_sync_car_finance_compat" BEFORE INSERT OR UPDATE ON "public"."car_finance" FOR EACH ROW EXECUTE FUNCTION "public"."sync_car_finance_compat"();



CREATE OR REPLACE TRIGGER "trg_sync_car_images_compat" BEFORE INSERT OR UPDATE ON "public"."car_images" FOR EACH ROW EXECUTE FUNCTION "public"."sync_car_images_compat"();



CREATE OR REPLACE TRIGGER "trg_sync_cars_compat" BEFORE INSERT OR UPDATE ON "public"."cars" FOR EACH ROW EXECUTE FUNCTION "public"."sync_cars_compat"();



CREATE OR REPLACE TRIGGER "trg_sync_cars_type" BEFORE INSERT OR UPDATE ON "public"."cars" FOR EACH ROW EXECUTE FUNCTION "public"."sync_cars_type"();



CREATE OR REPLACE TRIGGER "trg_unmark_car_sold" AFTER DELETE ON "public"."sales" FOR EACH ROW EXECUTE FUNCTION "public"."unmark_car_sold"();



ALTER TABLE ONLY "public"."car_details"
    ADD CONSTRAINT "car_details_car_id_fkey" FOREIGN KEY ("car_id") REFERENCES "public"."cars"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."car_finance"
    ADD CONSTRAINT "car_finance_car_id_fkey" FOREIGN KEY ("car_id") REFERENCES "public"."cars"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."car_finance"
    ADD CONSTRAINT "car_finance_supplier_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."car_images"
    ADD CONSTRAINT "car_images_car_id_fkey" FOREIGN KEY ("car_id") REFERENCES "public"."cars"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."car_models"
    ADD CONSTRAINT "car_models_make_id_fkey" FOREIGN KEY ("make_id") REFERENCES "public"."car_makes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sales"
    ADD CONSTRAINT "sales_car_id_fkey" FOREIGN KEY ("car_id") REFERENCES "public"."cars"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."sales"
    ADD CONSTRAINT "sales_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE RESTRICT;



ALTER TABLE "public"."car_details" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "car_details_admin_write" ON "public"."car_details" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "car_details_select_all_auth" ON "public"."car_details" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."car_finance" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "car_finance_admin_all" ON "public"."car_finance" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



ALTER TABLE "public"."car_images" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "car_images_admin_delete" ON "public"."car_images" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "car_images_admin_insert" ON "public"."car_images" FOR INSERT TO "authenticated" WITH CHECK (("public"."is_admin"() AND ("created_by" = "auth"."uid"())));



CREATE POLICY "car_images_admin_update" ON "public"."car_images" FOR UPDATE TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "car_images_admin_write" ON "public"."car_images" FOR INSERT TO "authenticated" WITH CHECK (("public"."is_admin"() AND ("created_by" = "auth"."uid"())));



CREATE POLICY "car_images_select_all_auth" ON "public"."car_images" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."car_makes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "car_makes_admin_write" ON "public"."car_makes" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "car_makes_select_auth" ON "public"."car_makes" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."car_models" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "car_models_admin_write" ON "public"."car_models" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "car_models_select_auth" ON "public"."car_models" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."cars" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "cars_admin_delete" ON "public"."cars" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "cars_admin_insert" ON "public"."cars" FOR INSERT TO "authenticated" WITH CHECK (("public"."is_admin"() AND ("created_by" = "auth"."uid"()) AND ("updated_by" = "auth"."uid"())));



CREATE POLICY "cars_admin_update" ON "public"."cars" FOR UPDATE TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "cars_select_all_auth" ON "public"."cars" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."customers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "customers_admin_delete" ON "public"."customers" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "customers_admin_update" ON "public"."customers" FOR UPDATE TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "customers_insert_auth" ON "public"."customers" FOR INSERT TO "authenticated" WITH CHECK (("created_by" = "auth"."uid"()));



CREATE POLICY "customers_select_all_auth" ON "public"."customers" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_admin_update_all" ON "public"."profiles" FOR UPDATE TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "profiles_select_admin_all" ON "public"."profiles" FOR SELECT TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "profiles_select_own" ON "public"."profiles" FOR SELECT TO "authenticated" USING (("id" = "auth"."uid"()));



CREATE POLICY "profiles_update_own_basic" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("id" = "auth"."uid"())) WITH CHECK (("id" = "auth"."uid"()));



ALTER TABLE "public"."sales" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "sales_admin_delete" ON "public"."sales" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "sales_admin_select_all" ON "public"."sales" FOR SELECT TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "sales_admin_update" ON "public"."sales" FOR UPDATE TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "sales_insert_admin_or_sales" ON "public"."sales" FOR INSERT TO "authenticated" WITH CHECK ((("public"."is_admin"() OR "public"."is_sales"()) AND ("created_by" = "auth"."uid"())));



CREATE POLICY "sales_salesperson_select_own" ON "public"."sales" FOR SELECT TO "authenticated" USING (("public"."is_sales"() AND ("created_by" = "auth"."uid"())));



ALTER TABLE "public"."suppliers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "suppliers_admin_all" ON "public"."suppliers" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."cars_count_by_status"("target" "public"."car_status") TO "anon";
GRANT ALL ON FUNCTION "public"."cars_count_by_status"("target" "public"."car_status") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cars_count_by_status"("target" "public"."car_status") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_sales"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_sales"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_sales"() TO "service_role";



GRANT ALL ON FUNCTION "public"."mark_car_sold"() TO "anon";
GRANT ALL ON FUNCTION "public"."mark_car_sold"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_car_sold"() TO "service_role";



GRANT ALL ON FUNCTION "public"."profit_sum_total"() TO "anon";
GRANT ALL ON FUNCTION "public"."profit_sum_total"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."profit_sum_total"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sales_sum_this_month"() TO "anon";
GRANT ALL ON FUNCTION "public"."sales_sum_this_month"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sales_sum_this_month"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sales_sum_total"() TO "anon";
GRANT ALL ON FUNCTION "public"."sales_sum_total"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sales_sum_total"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_car_finance_compat"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_car_finance_compat"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_car_finance_compat"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_car_images_compat"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_car_images_compat"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_car_images_compat"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_cars_compat"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_cars_compat"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_cars_compat"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_cars_type"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_cars_type"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_cars_type"() TO "service_role";



GRANT ALL ON FUNCTION "public"."unmark_car_sold"() TO "anon";
GRANT ALL ON FUNCTION "public"."unmark_car_sold"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."unmark_car_sold"() TO "service_role";


















GRANT ALL ON TABLE "public"."car_details" TO "anon";
GRANT ALL ON TABLE "public"."car_details" TO "authenticated";
GRANT ALL ON TABLE "public"."car_details" TO "service_role";



GRANT ALL ON TABLE "public"."car_finance" TO "anon";
GRANT ALL ON TABLE "public"."car_finance" TO "authenticated";
GRANT ALL ON TABLE "public"."car_finance" TO "service_role";



GRANT ALL ON TABLE "public"."car_images" TO "anon";
GRANT ALL ON TABLE "public"."car_images" TO "authenticated";
GRANT ALL ON TABLE "public"."car_images" TO "service_role";



GRANT ALL ON TABLE "public"."car_makes" TO "anon";
GRANT ALL ON TABLE "public"."car_makes" TO "authenticated";
GRANT ALL ON TABLE "public"."car_makes" TO "service_role";



GRANT ALL ON TABLE "public"."car_models" TO "anon";
GRANT ALL ON TABLE "public"."car_models" TO "authenticated";
GRANT ALL ON TABLE "public"."car_models" TO "service_role";



GRANT ALL ON TABLE "public"."cars" TO "anon";
GRANT ALL ON TABLE "public"."cars" TO "authenticated";
GRANT ALL ON TABLE "public"."cars" TO "service_role";



GRANT ALL ON TABLE "public"."customers" TO "anon";
GRANT ALL ON TABLE "public"."customers" TO "authenticated";
GRANT ALL ON TABLE "public"."customers" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."sales" TO "anon";
GRANT ALL ON TABLE "public"."sales" TO "authenticated";
GRANT ALL ON TABLE "public"."sales" TO "service_role";



GRANT ALL ON TABLE "public"."sales_list_view" TO "anon";
GRANT ALL ON TABLE "public"."sales_list_view" TO "authenticated";
GRANT ALL ON TABLE "public"."sales_list_view" TO "service_role";



GRANT ALL ON TABLE "public"."suppliers" TO "anon";
GRANT ALL ON TABLE "public"."suppliers" TO "authenticated";
GRANT ALL ON TABLE "public"."suppliers" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































drop extension if exists "pg_net";

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


  create policy "car_images_delete_admin"
  on "storage"."objects"
  as permissive
  for delete
  to authenticated
using (((bucket_id = 'car-images'::text) AND public.is_admin()));



  create policy "car_images_insert_admin"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check (((bucket_id = 'car-images'::text) AND public.is_admin()));



  create policy "car_images_read_auth"
  on "storage"."objects"
  as permissive
  for select
  to authenticated
using ((bucket_id = 'car-images'::text));



  create policy "car_images_update_admin"
  on "storage"."objects"
  as permissive
  for update
  to authenticated
using (((bucket_id = 'car-images'::text) AND public.is_admin()))
with check (((bucket_id = 'car-images'::text) AND public.is_admin()));



