import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="min-h-screen bg-white flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <div className="text-6xl font-bold text-gray-100 mb-4">404</div>
        <h1 className="text-xl font-semibold text-gray-900 mb-2">Rapport introuvable</h1>
        <p className="text-gray-500 text-sm mb-6">
          Ce rapport n&apos;existe pas ou a expiré. Lancez une nouvelle analyse.
        </p>
        <Link href="/" className="inline-block bg-blue-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-blue-700 transition">
          Nouvelle analyse
        </Link>
      </div>
    </main>
  );
}
