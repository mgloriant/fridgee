import { Redirect } from "expo-router";

// Confirm screen no longer used — redirect to barcode
export default function ConfirmRedirect() {
  return <Redirect href="/scan/barcode" />;
}
