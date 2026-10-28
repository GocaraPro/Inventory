import { redirect } from "next/navigation";
import { isDemo,databaseUrl } from "@/lib/db";
import { isOwner } from "@/lib/access";
import { getHoldings,getSnapshots,getSyncInfo,getSales } from "@/lib/repository";
import { demoHoldings,demoSnapshots } from "@/lib/demo";
import Dashboard from "@/components/dashboard";
import { enrich } from "@/lib/product-metadata";
export const dynamic="force-dynamic";
export default async function Page() {
  const demo=isDemo();
  if(!demo && !databaseUrl()) return <main className="auth-screen"><section className="auth-card"><span className="pokeball"/><h1>Your collection starts here.</h1><p>The app is built. Connect your database and email sign-in to open your private inventory.</p><p className="muted">Follow the deployment steps in the project README. Demo mode is available only in local development.</p></section></main>;
  if(!await isOwner())redirect("/login");
  const [holdings,snapshots,sync,sales]=demo?[demoHoldings,demoSnapshots,{lastSuccess:null,sourceDate:null,error:null},[]]:await Promise.all([getHoldings(),getSnapshots(),getSyncInfo(),getSales()]);
  return <Dashboard initialHoldings={holdings.map(enrich)} snapshots={snapshots} sync={sync} initialSales={sales} demo={demo}/>;
}
