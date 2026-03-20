import NavBar from '@/components/NavBar';
import AdminPanel from '@/components/AdminPanel';

export default function AdminPage() {
  return (
    <>
      <NavBar />
      <main style={{ flex: 1 }}>
        <AdminPanel />
      </main>
    </>
  );
}
