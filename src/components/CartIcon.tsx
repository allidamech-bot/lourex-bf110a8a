import { useState, useEffect, forwardRef } from "react";
import { ShoppingCart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface CartIconProps {
  userId: string;
}

const CartIcon = forwardRef<HTMLButtonElement, CartIconProps>(({ userId }, ref) => {
  const [count, setCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;
    const channelName = `cart-count-${userId}-${crypto.randomUUID()}`;

    const fetchCount = async () => {
      const { count: c } = await supabase
        .from("cart_items")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);

      if (isMounted) {
        setCount(c ?? 0);
      }
    };

    void fetchCount();

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "cart_items",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          void fetchCount();
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  return (
    <button
      ref={ref}
      onClick={() => navigate("/cart")}
      className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
      aria-label="Shopping Cart"
    >
      <ShoppingCart className="w-5 h-5" />
      {count > 0 && (
        <span className="absolute -top-0.5 -end-0.5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </button>
  );
});

CartIcon.displayName = "CartIcon";

export default CartIcon;
