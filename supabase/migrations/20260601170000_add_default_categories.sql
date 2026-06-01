INSERT INTO public.categories (user_id, name, kind, color, icon)
SELECT users.id, defaults.name, defaults.kind, defaults.color, defaults.icon
FROM auth.users AS users
CROSS JOIN (
  VALUES
    ('Rent',      'expense', '#a855f7', 'house'),
    ('Borrow In', 'income',  '#22c55e', 'hand-coins'),
    ('Lend Out',  'expense', '#f97316', 'hand-coins'),
    ('Internet',  'expense', '#0ea5e9', 'wifi')
) AS defaults(name, kind, color, icon)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.categories AS categories
  WHERE categories.user_id = users.id
    AND lower(categories.name) = lower(defaults.name)
    AND categories.kind = defaults.kind
);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));

  INSERT INTO public.categories (user_id, name, kind, color, icon) VALUES
    (NEW.id, 'Salary',        'income',  '#10b981', 'briefcase'),
    (NEW.id, 'Borrow In',     'income',  '#22c55e', 'hand-coins'),
    (NEW.id, 'Food',          'expense', '#ef4444', 'utensils'),
    (NEW.id, 'Transport',     'expense', '#f59e0b', 'car'),
    (NEW.id, 'Bills',         'expense', '#8b5cf6', 'receipt'),
    (NEW.id, 'Rent',          'expense', '#a855f7', 'house'),
    (NEW.id, 'Internet',      'expense', '#0ea5e9', 'wifi'),
    (NEW.id, 'Lend Out',      'expense', '#f97316', 'hand-coins'),
    (NEW.id, 'Shopping',      'expense', '#ec4899', 'shopping-bag'),
    (NEW.id, 'Entertainment', 'expense', '#06b6d4', 'film'),
    (NEW.id, 'Health',        'expense', '#14b8a6', 'heart'),
    (NEW.id, 'Other',         'expense', '#64748b', 'wallet');

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
