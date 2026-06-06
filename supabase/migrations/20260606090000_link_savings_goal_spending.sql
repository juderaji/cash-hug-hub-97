ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS savings_goal_id UUID REFERENCES public.savings_goals(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_savings_goal_id
ON public.transactions(savings_goal_id)
WHERE savings_goal_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.create_transaction(
  p_account_id UUID,
  p_category_id UUID,
  p_amount NUMERIC,
  p_type TEXT,
  p_description TEXT,
  p_occurred_on DATE,
  p_savings_goal_id UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_account public.accounts%ROWTYPE;
  v_goal public.savings_goals%ROWTYPE;
  v_allocated NUMERIC(14,2);
  v_unallocated NUMERIC(14,2);
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Transaction amount must be greater than zero';
  END IF;

  IF p_type NOT IN ('income', 'expense') THEN
    RAISE EXCEPTION 'Only income and expense transactions can be created here';
  END IF;

  SELECT *
  INTO v_account
  FROM public.accounts
  WHERE id = p_account_id
    AND user_id = v_user_id
    AND archived = false
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Account is unavailable';
  END IF;

  IF p_category_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.categories
    WHERE id = p_category_id
      AND user_id = v_user_id
      AND kind = p_type
  ) THEN
    RAISE EXCEPTION 'Category is unavailable for this transaction type';
  END IF;

  IF p_savings_goal_id IS NOT NULL THEN
    IF p_type <> 'expense' OR v_account.type <> 'savings' THEN
      RAISE EXCEPTION 'Savings goals can only be used for expenses from savings accounts';
    END IF;

    IF v_account.balance < p_amount THEN
      RAISE EXCEPTION 'Insufficient funds in this savings account';
    END IF;

    SELECT *
    INTO v_goal
    FROM public.savings_goals
    WHERE id = p_savings_goal_id
      AND user_id = v_user_id
      AND account_id = p_account_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Savings goal is unavailable for this account';
    END IF;

    IF v_goal.saved_amount < p_amount THEN
      RAISE EXCEPTION 'This savings goal does not have enough saved money';
    END IF;

    UPDATE public.savings_goals
    SET saved_amount = saved_amount - p_amount,
        updated_at = now()
    WHERE id = p_savings_goal_id;
  ELSIF p_type = 'expense' AND v_account.type = 'savings' THEN
    IF v_account.balance < p_amount THEN
      RAISE EXCEPTION 'Insufficient funds in this savings account';
    END IF;

    SELECT COALESCE(sum(saved_amount), 0)
    INTO v_allocated
    FROM public.savings_goals
    WHERE account_id = p_account_id
      AND user_id = v_user_id;

    v_unallocated := v_account.balance - v_allocated;

    IF v_unallocated < p_amount THEN
      RAISE EXCEPTION 'Not enough unallocated savings. Choose a savings goal if this spend should come from a pot.';
    END IF;
  END IF;

  UPDATE public.accounts
  SET balance = balance + CASE WHEN p_type = 'income' THEN p_amount ELSE -p_amount END,
      updated_at = now()
  WHERE id = p_account_id;

  INSERT INTO public.transactions (
    user_id, account_id, category_id, amount, type, description, occurred_on, savings_goal_id
  )
  VALUES (
    v_user_id,
    p_account_id,
    p_category_id,
    p_amount,
    p_type,
    NULLIF(trim(p_description), ''),
    p_occurred_on,
    p_savings_goal_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.update_transaction(
  p_transaction_id UUID,
  p_account_id UUID,
  p_category_id UUID,
  p_amount NUMERIC,
  p_type TEXT,
  p_description TEXT,
  p_occurred_on DATE,
  p_savings_goal_id UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_transaction public.transactions%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT *
  INTO v_transaction
  FROM public.transactions
  WHERE id = p_transaction_id
    AND user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction not found';
  END IF;

  IF v_transaction.type NOT IN ('income', 'expense') THEN
    RAISE EXCEPTION 'Transfers cannot be edited';
  END IF;

  IF v_transaction.savings_goal_id IS NOT NULL THEN
    UPDATE public.savings_goals
    SET saved_amount = saved_amount + v_transaction.amount,
        updated_at = now()
    WHERE id = v_transaction.savings_goal_id
      AND user_id = v_user_id;
  END IF;

  IF v_transaction.account_id IS NOT NULL THEN
    UPDATE public.accounts
    SET balance = balance + CASE WHEN v_transaction.type = 'income' THEN -v_transaction.amount ELSE v_transaction.amount END,
        updated_at = now()
    WHERE id = v_transaction.account_id
      AND user_id = v_user_id;
  END IF;

  DELETE FROM public.transactions
  WHERE id = p_transaction_id
    AND user_id = v_user_id;

  PERFORM public.create_transaction(
    p_account_id,
    p_category_id,
    p_amount,
    p_type,
    p_description,
    p_occurred_on,
    p_savings_goal_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_transaction(p_transaction_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_transaction public.transactions%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT *
  INTO v_transaction
  FROM public.transactions
  WHERE id = p_transaction_id
    AND user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction not found';
  END IF;

  IF v_transaction.type NOT IN ('income', 'expense') THEN
    RAISE EXCEPTION 'Transfers cannot be deleted';
  END IF;

  IF v_transaction.savings_goal_id IS NOT NULL THEN
    UPDATE public.savings_goals
    SET saved_amount = saved_amount + v_transaction.amount,
        updated_at = now()
    WHERE id = v_transaction.savings_goal_id
      AND user_id = v_user_id;
  END IF;

  IF v_transaction.account_id IS NOT NULL THEN
    UPDATE public.accounts
    SET balance = balance + CASE WHEN v_transaction.type = 'income' THEN -v_transaction.amount ELSE v_transaction.amount END,
        updated_at = now()
    WHERE id = v_transaction.account_id
      AND user_id = v_user_id;
  END IF;

  DELETE FROM public.transactions
  WHERE id = p_transaction_id
    AND user_id = v_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_transaction(UUID, UUID, NUMERIC, TEXT, TEXT, DATE, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_transaction(UUID, UUID, UUID, NUMERIC, TEXT, TEXT, DATE, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_transaction(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_transaction(UUID, UUID, NUMERIC, TEXT, TEXT, DATE, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_transaction(UUID, UUID, UUID, NUMERIC, TEXT, TEXT, DATE, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_transaction(UUID) TO authenticated;
