import NavBar from '@/components/NavBar';
import ResultsView from '@/components/ResultsView';

export default function ResultsPage() {
  return (
    <>
      <NavBar />
      <main style={{ flex: 1 }}>
        <ResultsView />
      </main>
    </>
  );
}
