import React, { useState, useEffect } from 'react';
import { Plus, X, Play, ChevronLeft, Trophy, Target, Users, Map, Hash, Search, LogIn } from 'lucide-react';
import { motion } from 'motion/react';
import { db, auth, signInWithGoogle } from './firebase';
import { doc, setDoc, getDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';

const generateId = () => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

type TeamData = {
  id: string;
  name: string;
  slot: number;
  scores: Record<string, number | ''>;
};

type Category = {
  name: string;
  isScoring: boolean;
};

type TournamentData = {
  game: string;
  numMatches: number;
  maps: string[];
  teams: TeamData[];
  categories: Category[];
  scores: Record<string, Record<string, number | ''>>;
  ownerId: string;
  createdAt: any;
};

const FilmStripLeft = () => (
  <div className="absolute left-2 md:left-8 top-0 bottom-0 w-12 flex flex-col justify-around opacity-20 pointer-events-none overflow-hidden">
    {Array.from({ length: 20 }).map((_, i) => (
      <div key={i} className="w-16 h-12 border-4 border-white transform -skew-y-12 -translate-x-4"></div>
    ))}
  </div>
);

const FilmStripRight = () => (
  <div className="absolute right-2 md:right-8 top-0 bottom-0 w-12 flex flex-col justify-around opacity-20 pointer-events-none overflow-hidden">
    {Array.from({ length: 20 }).map((_, i) => (
      <div key={i} className="w-16 h-12 border-4 border-white transform skew-y-12 translate-x-4"></div>
    ))}
  </div>
);

const GrungeOverlay = () => (
  <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.03]" xmlns="http://www.w3.org/2000/svg">
    <filter id="noiseFilter">
      <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch"/>
    </filter>
    <rect width="100%" height="100%" filter="url(#noiseFilter)"/>
  </svg>
);

function LandingScreen({ onOrganize, onView }: { onOrganize: () => void, onView: () => void }) {
  return (
    <div className="min-h-screen bg-[#061178] relative overflow-hidden font-roboto flex flex-col items-center justify-center py-12">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,#0a1996_0%,#040b52_100%)]"></div>
      <GrungeOverlay />
      <div className="relative z-10 w-full max-w-4xl px-4 flex flex-col items-center text-center">
        <Trophy className="text-yellow-400 mb-6" size={80} />
        <h1 className="text-white font-oswald text-5xl md:text-7xl font-bold mb-4 tracking-wider uppercase">Esports Standings</h1>
        <p className="text-blue-200 text-xl mb-12 max-w-2xl">Create, manage, and share live point standings for your esports tournaments.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
          <button 
            onClick={onOrganize}
            className="bg-white text-[#0a1996] p-8 rounded-2xl font-bold text-2xl flex flex-col items-center gap-4 hover:bg-gray-100 transition-all transform hover:-translate-y-2 shadow-2xl"
          >
            <Trophy size={48} className="text-yellow-500" />
            Organize Tournament
            <span className="text-sm font-normal text-gray-500">Create a new tournament and manage scores</span>
          </button>
          
          <button 
            onClick={onView}
            className="bg-[#2734d9] text-white p-8 rounded-2xl font-bold text-2xl flex flex-col items-center gap-4 hover:bg-[#3845b5] transition-all transform hover:-translate-y-2 shadow-2xl border border-[#4351c9]"
          >
            <Search size={48} className="text-blue-300" />
            View Standings
            <span className="text-sm font-normal text-blue-200">Enter a code to watch live scores</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function ViewInitScreen({ onJoin, onBack }: { onJoin: (code: string) => void, onBack: () => void }) {
  const [code, setCode] = useState('');

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 flex items-center justify-center font-roboto">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8">
        <button onClick={onBack} className="text-gray-500 hover:text-gray-900 mb-6 flex items-center gap-2">
          <ChevronLeft size={20} /> Back
        </button>
        <h2 className="text-3xl font-oswald font-bold text-gray-900 mb-6 uppercase">Join Tournament</h2>
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Tournament Code</label>
          <input 
            type="text" 
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            placeholder="e.g. A1B2C3"
            maxLength={6}
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-2xl tracking-widest text-center uppercase focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>
        <button 
          onClick={() => onJoin(code)}
          disabled={code.length < 6}
          className="w-full bg-[#0a1996] text-white px-6 py-4 rounded-xl font-bold text-lg hover:bg-blue-800 transition-all disabled:opacity-50"
        >
          View Live Standings
        </button>
      </div>
    </div>
  );
}

function OrganizeInitScreen({ onNext, onBack }: { onNext: (game: string, numMatches: number, maps: string[]) => void, onBack: () => void }) {
  const [game, setGame] = useState('Free Fire');
  const [numMatches, setNumMatches] = useState(3);
  const [maps, setMaps] = useState<string[]>(['Bermuda', 'Purgatory', 'Kalahari']);

  const handleNumMatchesChange = (num: number) => {
    setNumMatches(num);
    const newMaps = [...maps];
    while (newMaps.length < num) newMaps.push('');
    setMaps(newMaps.slice(0, num));
  };

  const handleMapChange = (index: number, value: string) => {
    const newMaps = [...maps];
    newMaps[index] = value;
    setMaps(newMaps);
  };

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 flex items-center justify-center font-roboto">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-2xl p-8">
        <button onClick={onBack} className="text-gray-500 hover:text-gray-900 mb-6 flex items-center gap-2">
          <ChevronLeft size={20} /> Back
        </button>
        <h2 className="text-3xl font-oswald font-bold text-gray-900 mb-8 uppercase flex items-center gap-3">
          <Target className="text-blue-600" /> Tournament Details
        </h2>
        
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Game Name</label>
            <input 
              type="text" 
              value={game}
              onChange={e => setGame(e.target.value)}
              placeholder="e.g. Free Fire, PUBG Mobile"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Number of Matches</label>
            <input 
              type="number" 
              min="1" max="20"
              value={numMatches}
              onChange={e => handleNumMatchesChange(parseInt(e.target.value) || 1)}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Maps</label>
            <div className="space-y-3">
              {maps.map((map, index) => (
                <div key={index} className="flex items-center gap-3">
                  <span className="text-gray-500 font-medium w-8">M{index + 1}</span>
                  <input 
                    type="text" 
                    value={map}
                    onChange={e => handleMapChange(index, e.target.value)}
                    placeholder={`Map ${index + 1} name`}
                    className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        <button 
          onClick={() => onNext(game, numMatches, maps)}
          disabled={!game.trim() || maps.some(m => !m.trim())}
          className="mt-8 w-full bg-[#0a1996] text-white px-6 py-4 rounded-xl font-bold text-lg hover:bg-blue-800 transition-all disabled:opacity-50"
        >
          Next: Setup Teams & Categories
        </button>
      </div>
    </div>
  );
}

function SetupScreen({ 
  onComplete,
  onBack
}: { 
  onComplete: (t: {name: string, slot: number}[], c: Category[]) => void,
  onBack: () => void
}) {
  const [teams, setTeams] = useState<{name: string, slot: number}[]>([
    { name: 'ALDENAIRE FC', slot: 1 },
    { name: 'AROWWAI FC', slot: 2 },
    { name: 'BORCELLE FC', slot: 3 },
    { name: 'FRADEL FC', slot: 4 },
    { name: 'GIGGLING FC', slot: 5 }
  ]);
  const [categories, setCategories] = useState<Category[]>([
    { name: 'WINS', isScoring: false },
    { name: 'BOO_Y YAH...', isScoring: true }, 
    { name: 'PP', isScoring: true }, 
    { name: 'KP', isScoring: true }
  ]);
  const [newTeam, setNewTeam] = useState('');
  const [newCat, setNewCat] = useState('');
  const [newCatScoring, setNewCatScoring] = useState(true);

  const addTeam = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTeam.trim() && !teams.some(t => t.name === newTeam.trim())) {
      const nextSlot = teams.length > 0 ? Math.max(...teams.map(t => t.slot)) + 1 : 1;
      setTeams([...teams, { name: newTeam.trim(), slot: nextSlot }]);
      setNewTeam('');
    }
  };

  const removeTeam = (teamName: string) => {
    setTeams(teams.filter(t => t.name !== teamName));
  };

  const addCat = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCat.trim() && !categories.some(c => c.name === newCat.trim())) {
      setCategories([...categories, { name: newCat.trim(), isScoring: newCatScoring }]);
      setNewCat('');
      setNewCatScoring(true);
    }
  };

  const removeCat = (catName: string) => {
    setCategories(categories.filter(c => c.name !== catName));
  };

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8 font-roboto flex items-center justify-center">
      <div className="max-w-5xl w-full bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="bg-[#0a1996] px-8 py-8 text-white relative overflow-hidden">
          <button onClick={onBack} className="absolute top-4 left-4 text-white/70 hover:text-white flex items-center gap-1 z-20">
            <ChevronLeft size={20} /> Back
          </button>
          <div className="absolute inset-0 opacity-20">
            <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="grid-pattern" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M0 40L40 0H20L0 20M40 40V20L20 40" stroke="currentColor" strokeWidth="2" fill="none"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid-pattern)"/>
            </svg>
          </div>
          <div className="relative z-10 mt-6">
            <h1 className="text-4xl font-oswald font-bold tracking-wide uppercase flex items-center gap-3">
              <Users className="text-yellow-400" size={36} />
              Teams & Categories
            </h1>
            <p className="opacity-80 mt-2 text-lg">Configure your teams and point categories.</p>
          </div>
        </div>
        
        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-12 bg-gray-50">
          {/* Teams Section */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="bg-blue-100 text-blue-600 p-2 rounded-lg"><Trophy size={20} /></span>
              Participating Teams
            </h2>
            <form onSubmit={addTeam} className="flex gap-2 mb-6">
              <input 
                type="text" 
                value={newTeam}
                onChange={e => setNewTeam(e.target.value)}
                placeholder="Enter team name..."
                className="flex-1 border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              />
              <button type="submit" disabled={!newTeam.trim()} className="bg-[#0a1996] text-white px-4 py-2 rounded-lg hover:bg-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                <Plus size={24} />
              </button>
            </form>
            <ul className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {teams.map(team => (
                <motion.li 
                  layout
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={team.name} 
                  className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 group hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded">SLOT {team.slot}</span>
                    <span className="font-medium text-gray-700">{team.name}</span>
                  </div>
                  <button onClick={() => removeTeam(team.name)} className="text-gray-400 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <X size={20} />
                  </button>
                </motion.li>
              ))}
              {teams.length === 0 && (
                <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
                  <p>No teams added yet.</p>
                </div>
              )}
            </ul>
          </div>

          {/* Categories Section */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="bg-blue-100 text-blue-600 p-2 rounded-lg"><Target size={20} /></span>
              Point Categories
            </h2>
            <form onSubmit={addCat} className="flex flex-col gap-3 mb-6">
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={newCat}
                  onChange={e => setNewCat(e.target.value)}
                  placeholder="e.g. Kills, Placement..."
                  className="flex-1 border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                />
                <button type="submit" disabled={!newCat.trim()} className="bg-[#0a1996] text-white px-4 py-2 rounded-lg hover:bg-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  <Plus size={24} />
                </button>
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer ml-1">
                <input 
                  type="checkbox" 
                  checked={newCatScoring} 
                  onChange={e => setNewCatScoring(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                />
                Counts towards total points
              </label>
            </form>
            <ul className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {categories.map(cat => (
                <motion.li 
                  layout
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={cat.name} 
                  className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 group hover:border-blue-300 transition-colors"
                >
                  <div className="flex flex-col">
                    <span className="font-medium text-gray-700">{cat.name}</span>
                    <span className="text-xs text-gray-500">{cat.isScoring ? 'Affects Total Points' : 'Display Only (No Points)'}</span>
                  </div>
                  <button onClick={() => removeCat(cat.name)} className="text-gray-400 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <X size={20} />
                  </button>
                </motion.li>
              ))}
              {categories.length === 0 && (
                <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
                  <p>No categories added yet.</p>
                </div>
              )}
            </ul>
          </div>
        </div>

        <div className="bg-white px-8 py-6 border-t border-gray-100 flex justify-end">
          <button 
            onClick={() => onComplete(teams, categories)}
            disabled={teams.length === 0 || categories.length === 0}
            className="bg-[#0a1996] text-white px-8 py-4 rounded-xl font-bold text-lg flex items-center gap-3 hover:bg-blue-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-blue-900/20 hover:shadow-blue-900/40 transform hover:-translate-y-1"
          >
            Create Tournament <Play size={20} fill="currentColor" />
          </button>
        </div>
      </div>
    </div>
  );
}

function StandingsScreen({ 
  tournamentId,
  tournament,
  isOwner,
  onScoreChange, 
  onBack 
}: { 
  tournamentId: string,
  tournament: TournamentData,
  isOwner: boolean,
  onScoreChange: (teamId: string, cat: string, value: string) => void, 
  onBack: () => void 
}) {
  const sortedTeams = [...tournament.teams].sort((a, b) => {
    const ptsA = tournament.categories.filter(c => c.isScoring).reduce((sum, c) => sum + (Number(tournament.scores[a.id]?.[c.name]) || 0), 0);
    const ptsB = tournament.categories.filter(c => c.isScoring).reduce((sum, c) => sum + (Number(tournament.scores[b.id]?.[c.name]) || 0), 0);
    return ptsB - ptsA;
  });

  return (
    <div className="min-h-screen bg-[#061178] relative overflow-hidden font-roboto flex flex-col items-center py-12">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,#0a1996_0%,#040b52_100%)]"></div>
      <GrungeOverlay />
      <FilmStripLeft />
      <FilmStripRight />
      
      <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 transform rotate-45 translate-x-32 -translate-y-32 blur-2xl"></div>
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-white opacity-10 transform rotate-45 -translate-x-32 translate-y-32 blur-2xl"></div>

      <div className="relative z-10 w-full max-w-6xl px-4 md:px-12 flex flex-col items-center">
        <div className="w-full flex justify-between items-start mb-4">
          <button onClick={onBack} className="flex items-center gap-2 text-white/70 hover:text-white transition-colors bg-white/5 px-4 py-2 rounded-full hover:bg-white/10 text-sm">
            <ChevronLeft size={16} /> Exit
          </button>
          
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl px-6 py-3 text-center">
            <p className="text-blue-200 text-xs uppercase tracking-widest mb-1">Tournament Code</p>
            <p className="text-white font-mono text-2xl font-bold tracking-widest">{tournamentId}</p>
          </div>
        </div>

        <div className="relative flex items-center justify-center w-20 h-20 mb-2">
          <svg viewBox="0 0 24 24" fill="none" stroke="#FBBF24" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-14 h-14">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 12l3.5 2 1.5-4.5-4-2.5-4 2.5 1.5 4.5z" />
            <path d="M12 12v10" />
            <path d="M15.5 14l4.5 2.5" />
            <path d="M17 7.5l4.5-2.5" />
            <path d="M8.5 14l-4.5 2.5" />
            <path d="M7 7.5l-4.5-2.5" />
          </svg>
          <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-yellow-400 rounded-tr-full"></div>
          <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-yellow-400 rounded-bl-full"></div>
        </div>
        
        <h2 className="text-yellow-400 font-bold italic text-xl md:text-2xl tracking-widest uppercase">{tournament.game}</h2>
        <h1 className="text-white font-oswald text-5xl md:text-7xl font-bold mt-2 mb-10 tracking-wider uppercase text-center">Point Standings</h1>
        
        <div className="w-full overflow-x-auto shadow-2xl rounded-sm">
          <table className="w-full border-collapse min-w-[800px]">
            <thead>
              <tr>
                <th className="bg-[#2734d9] text-white font-bold py-4 px-4 text-center border border-[#6b77d6] w-16 text-lg">POS</th>
                <th className="bg-[#2734d9] text-white font-bold py-4 px-4 text-center border border-[#6b77d6] w-16 text-lg">SLOT</th>
                <th className="bg-[#2734d9] text-white font-bold py-4 px-6 text-left border border-[#6b77d6] text-lg">CLUB</th>
                {tournament.categories.map(cat => (
                  <th key={cat.name} className="bg-[#2734d9] text-white font-bold py-4 px-4 text-center border border-[#6b77d6] uppercase whitespace-nowrap text-lg">
                    {cat.name}
                    {!cat.isScoring && <span className="block text-[10px] font-normal opacity-70 tracking-normal mt-1">(NO PTS)</span>}
                  </th>
                ))}
                <th className="bg-[#2734d9] text-white font-bold py-4 px-4 text-center border border-[#6b77d6] w-24 text-lg">PTS</th>
              </tr>
            </thead>
            <tbody>
              {sortedTeams.map((team, index) => {
                const totalPts = tournament.categories.filter(c => c.isScoring).reduce((sum, c) => sum + (Number(tournament.scores[team.id]?.[c.name]) || 0), 0);
                return (
                  <motion.tr 
                    layout
                    key={team.id} 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="bg-[#3845b5] hover:bg-[#4351c9] transition-colors group"
                  >
                    <td className="text-white py-3 px-4 text-center border border-[#6b77d6] font-medium text-xl">{index + 1}</td>
                    <td className="text-white py-3 px-4 text-center border border-[#6b77d6] font-medium text-lg text-blue-200">{team.slot}</td>
                    <td className="text-white py-3 px-6 text-left border border-[#6b77d6] font-medium uppercase tracking-wide text-lg">{team.name}</td>
                    {tournament.categories.map(cat => (
                      <td key={cat.name} className="border border-[#6b77d6] p-0 relative">
                        {isOwner ? (
                          <input 
                            type="number" 
                            value={tournament.scores[team.id]?.[cat.name] ?? ''}
                            onChange={(e) => onScoreChange(team.id, cat.name, e.target.value)}
                            className={`w-full h-full min-h-[3rem] bg-transparent text-white text-center py-3 px-4 focus:outline-none focus:bg-white/10 transition-colors text-lg ${!cat.isScoring ? 'text-yellow-300 font-bold' : ''}`}
                          />
                        ) : (
                          <div className={`w-full h-full min-h-[3rem] flex items-center justify-center text-center py-3 px-4 text-lg ${!cat.isScoring ? 'text-yellow-300 font-bold' : 'text-white'}`}>
                            {tournament.scores[team.id]?.[cat.name] ?? '-'}
                          </div>
                        )}
                      </td>
                    ))}
                    <td className="text-white py-3 px-4 text-center border border-[#6b77d6] font-bold text-2xl">{totalPts}</td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<'landing' | 'organizeInit' | 'setup' | 'viewInit' | 'standings'>('landing');
  
  // Organize state
  const [gameDetails, setGameDetails] = useState<{game: string, numMatches: number, maps: string[]} | null>(null);
  
  // Standings state
  const [tournamentId, setTournamentId] = useState<string>('');
  const [tournament, setTournament] = useState<TournamentData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (currentView === 'standings' && tournamentId) {
      const unsub = onSnapshot(doc(db, 'tournaments', tournamentId), (docSnap) => {
        if (docSnap.exists()) {
          setTournament(docSnap.data() as TournamentData);
        } else {
          setError('Tournament not found or deleted.');
          setCurrentView('landing');
        }
      }, (err) => {
        console.error(err);
        setError('Failed to load tournament data.');
      });
      return () => unsub();
    }
  }, [currentView, tournamentId]);

  const handleOrganizeClick = async () => {
    if (!user) {
      try {
        await signInWithGoogle();
        setCurrentView('organizeInit');
      } catch (e) {
        // Handle error
      }
    } else {
      setCurrentView('organizeInit');
    }
  };

  const handleOrganizeInitNext = (game: string, numMatches: number, maps: string[]) => {
    setGameDetails({ game, numMatches, maps });
    setCurrentView('setup');
  };

  const handleSetupComplete = async (teams: {name: string, slot: number}[], categories: Category[]) => {
    if (!user || !gameDetails) return;
    setLoading(true);
    
    const newId = generateId();
    
    const initialScores: Record<string, Record<string, number | ''>> = {};
    const teamsData: TeamData[] = teams.map(t => {
      const id = generateId();
      initialScores[id] = {};
      return { id, name: t.name, slot: t.slot, scores: {} };
    });

    const newTournament: TournamentData = {
      game: gameDetails.game,
      numMatches: gameDetails.numMatches,
      maps: gameDetails.maps,
      teams: teamsData,
      categories,
      scores: initialScores,
      ownerId: user.uid,
      createdAt: serverTimestamp()
    };

    try {
      await setDoc(doc(db, 'tournaments', newId), newTournament);
      setTournamentId(newId);
      setCurrentView('standings');
    } catch (err) {
      console.error(err);
      alert("Failed to create tournament.");
    } finally {
      setLoading(false);
    }
  };

  const handleJoinTournament = async (code: string) => {
    setLoading(true);
    try {
      const docSnap = await getDoc(doc(db, 'tournaments', code));
      if (docSnap.exists()) {
        setTournamentId(code);
        setCurrentView('standings');
      } else {
        alert("Tournament not found. Please check the code.");
      }
    } catch (err) {
      console.error(err);
      alert("Error joining tournament.");
    } finally {
      setLoading(false);
    }
  };

  const handleScoreChange = async (teamId: string, cat: string, value: string) => {
    if (!tournament || tournament.ownerId !== user?.uid) return;
    
    const numValue = value === '' ? '' : parseInt(value, 10);
    if (typeof numValue === 'number' && isNaN(numValue)) return;

    // Optimistic update
    const newScores = {
      ...tournament.scores,
      [teamId]: {
        ...(tournament.scores[teamId] || {}),
        [cat]: numValue
      }
    };
    
    setTournament({ ...tournament, scores: newScores });

    // Save to Firebase
    try {
      await setDoc(doc(db, 'tournaments', tournamentId), { scores: newScores }, { merge: true });
    } catch (err) {
      console.error("Failed to update score", err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#061178] flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-yellow-400"></div>
      </div>
    );
  }

  return (
    <>
      {currentView === 'landing' && (
        <LandingScreen 
          onOrganize={handleOrganizeClick} 
          onView={() => setCurrentView('viewInit')} 
        />
      )}
      
      {currentView === 'viewInit' && (
        <ViewInitScreen 
          onJoin={handleJoinTournament} 
          onBack={() => setCurrentView('landing')} 
        />
      )}
      
      {currentView === 'organizeInit' && (
        <OrganizeInitScreen 
          onNext={handleOrganizeInitNext} 
          onBack={() => setCurrentView('landing')} 
        />
      )}
      
      {currentView === 'setup' && (
        <SetupScreen 
          onComplete={handleSetupComplete} 
          onBack={() => setCurrentView('organizeInit')} 
        />
      )}
      
      {currentView === 'standings' && tournament && (
        <StandingsScreen 
          tournamentId={tournamentId}
          tournament={tournament}
          isOwner={user?.uid === tournament.ownerId}
          onScoreChange={handleScoreChange}
          onBack={() => {
            setTournamentId('');
            setTournament(null);
            setCurrentView('landing');
          }} 
        />
      )}
    </>
  );
}
