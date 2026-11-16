import Image from "next/image";

export default function Loading() {
  return (
    <div className="route-loading" role="status">
      <Image src="/icons/mosaipix-192.png" alt="" width={72} height={72} />
      <span lang="fr">Chargement…</span>
      <span lang="en">Loading…</span>
    </div>
  );
}
