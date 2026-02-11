import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "BankRead — Bank Statement Reader",
    short_name: "BankRead",
    description: "Parse bank statements into structured transactions",
    start_url: "/",
    display: "standalone",
    background_color: "#f9fafb",
    theme_color: "#2563eb",
  };
}
