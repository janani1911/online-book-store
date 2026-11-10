import {
  Ban, CheckCircle2, CircleDashed, Clock, PackageCheck, RotateCcw,
  ThumbsUp, Truck, XCircle, Bike, Wallet
} from "lucide-react";

// Each status has its own icon so the badge never relies on colour alone
const ICONS = {
  "Order Placed": Clock,
  Pending: Clock,
  Confirmed: ThumbsUp,
  Packed: PackageCheck,
  Shipped: Truck,
  "Out for Delivery": Bike,
  Delivered: CheckCircle2,
  Cancelled: Ban,
  Paid: Wallet,
  Failed: XCircle,
  Refunded: RotateCcw
};

const slug = text => String(text).toLowerCase().replace(/\s+/g, "-");

// kind = "order" | "payment" (Pending means different things in each)
export default function StatusBadge({ status, kind = "order" }) {
  const Icon = ICONS[status] || CircleDashed;
  return (
    <span className={`status-badge status-${kind}-${slug(status)}`}>
      <Icon size={12} aria-hidden="true" />
      {status}
    </span>
  );
}
