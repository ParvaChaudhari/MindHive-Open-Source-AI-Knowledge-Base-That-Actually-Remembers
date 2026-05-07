import { useState, useEffect } from 'react';
import { generateFlashcards } from '../api';

export default function FlashcardsModal({ docId, docName, onClose }) {
  const [flashcards, setFlashcards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    generateFlashcards(docId)
      .then(data => {
        setFlashcards(data.flashcards);
        setLoading(false);
      })
      .catch(e => {
        setError('Failed to generate flashcards. Please try again.');
        setLoading(false);
      });
  }, [docId]);

  const next = () => {
    if (currentIndex < flashcards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setShowAnswer(false);
    }
  };

  const prev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setShowAnswer(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-6 animate-in fade-in duration-300">
      <div className="bg-stone-50 border border-stone-200 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] text-stone-900">
        
        {/* Header */}
        <div className="p-6 border-b border-stone-200 flex items-center justify-between bg-stone-100/50">
          <div>
            <h3 className="font-headline-md text-headline-md flex items-center gap-2 text-stone-900">
              <span className="material-symbols-outlined text-primary">style</span>
              Flashcards
            </h3>
            <p className="text-stone-500 text-xs uppercase tracking-widest font-bold mt-1 truncate max-w-[300px]">
              {docName}
            </p>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-900 transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-8 flex flex-col items-center justify-center min-h-[300px]">
          {loading ? (
            <div className="text-center">
              <span className="material-symbols-outlined text-4xl text-primary animate-spin-reverse mb-4">sync</span>
              <p className="text-stone-600 font-label-md">Generating study material...</p>
            </div>
          ) : error ? (
            <div className="text-center text-error">
              <span className="material-symbols-outlined text-4xl mb-4">error</span>
              <p>{error}</p>
            </div>
          ) : flashcards.length === 0 ? (
            <p className="text-stone-400 italic">No flashcards could be generated for this document.</p>
          ) : (
            <>
              <div className="w-full flex-1 flex flex-col items-center justify-center">
                {/* Flashcard */}
                <div 
                  onClick={() => setShowAnswer(!showAnswer)}
                  className={`w-full max-w-md aspect-[4/3] relative perspective-1000 cursor-pointer transition-transform duration-500 preserve-3d ${showAnswer ? 'rotate-y-180' : ''}`}
                >
                  {/* Front (Question) */}
                  <div className="absolute inset-0 backface-hidden bg-white border-2 border-stone-200 rounded-2xl p-8 shadow-lg flex flex-col items-center justify-center text-center">
                    <span className="text-xs font-bold uppercase tracking-widest text-stone-500 mb-4">Question</span>
                    <p className="text-lg lg:text-xl font-headline leading-tight text-stone-900">
                      {flashcards[currentIndex].question}
                    </p>
                    <p className="mt-8 text-xs text-stone-400 animate-pulse">Click to flip</p>
                  </div>
                  
                  {/* Back (Answer) */}
                  <div className="absolute inset-0 backface-hidden rotate-y-180 bg-stone-50 border-2 border-primary/20 rounded-2xl p-8 shadow-lg flex flex-col items-center justify-center text-center">
                    <span className="text-xs font-bold uppercase tracking-widest text-primary mb-4">Answer</span>
                    <p className="text-md lg:text-lg font-body leading-relaxed text-stone-800">
                      {flashcards[currentIndex].answer}
                    </p>
                  </div>
                </div>

                <p className="mt-6 text-sm text-stone-500 font-label-md">
                  Card {currentIndex + 1} of {flashcards.length}
                </p>
              </div>

              {/* Navigation */}
              <div className="flex gap-4 mt-8">
                <button 
                  onClick={prev}
                  disabled={currentIndex === 0}
                  className="w-12 h-12 rounded-full border border-stone-200 flex items-center justify-center hover:bg-stone-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-stone-900"
                >
                  <span className="material-symbols-outlined">chevron_left</span>
                </button>
                <button 
                  onClick={next}
                  disabled={currentIndex === flashcards.length - 1}
                  className="w-12 h-12 rounded-full border border-stone-200 flex items-center justify-center hover:bg-stone-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-stone-900"
                >
                  <span className="material-symbols-outlined">chevron_right</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .perspective-1000 { perspective: 1000px; }
        .preserve-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        .rotate-y-180 { transform: rotateY(180deg); }
      `}} />
    </div>
  );
}
