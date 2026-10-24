/* eslint-disable max-len */
import React, { useState, useEffect, useRef } from 'react';
import { db, auth, storage } from '../../lib/firebase';
import { 
  collection, query, orderBy, onSnapshot, doc, getDoc,
  updateDoc, deleteDoc, addDoc, serverTimestamp, setDoc, where
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { signOut, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { 
  ShoppingBag, Package, Users, LogOut, Plus, 
  Trash2, X, Loader2, Camera, ExternalLink, ChevronRight, Settings, Truck, Globe, Edit3, CheckCircle, Eye
} from 'lucide-react';

// Erreurs de connexion Google affichées en clair (au lieu d'un échec silencieux).
const loginErrorMessage = (code?: string): string | null => {
  switch (code) {
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return null;
    case 'auth/popup-blocked':
      return "La fenêtre de connexion a été bloquée par le navigateur. Autorisez les fenêtres pour ce site, puis réessayez.";
    case 'auth/operation-not-allowed':
      return "La connexion Google n'est pas activée pour ce site (console Firebase, Authentication).";
    case 'auth/unauthorized-domain':
      return "Cette adresse du site n'est pas autorisée pour la connexion (console Firebase, domaines autorisés).";
    default:
      return "La connexion n'a pas abouti. Réessayez.";
  }
};

const Dashboard = () => {
  // --- ÉTATS ---
  const [user, setUser] = useState<any>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState<string | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'orders' | 'inventory' | 'customers' | 'settings'>('inventory');
  
  // Modales et Sélection
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [linkedBlog, setLinkedBlog] = useState<any>(null);
  
  // Données dynamiques
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [categoriesData, setCategoriesData] = useState<any[]>([]);
  const [selectedParentCat, setSelectedParentCat] = useState("");
  const [availableSubs, setAvailableSubs] = useState<string[]>([]);
  const [deliverySettings, setDeliverySettings] = useState<any>({ freeThreshold: 0, flatRate: 0, zones: "" });

  // Formulaire & Upload
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- PALETTE DE COULEURS HARMONISÉE ---
  const styles = { 
    cream: '#F5F2EE', 
    ink: '#1A1814', 
    border: 'rgba(26,24,20,0.15)',
    mutedInk: '#4A4742',
    accent: '#000000'
  };

  // --- LOGIQUE D'ACCÈS ---
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (u) => {
      if (u) {
        let allowed = false;
        try {
          const snap = u.email ? await getDoc(doc(db, "autorisations", u.email)) : null;
          allowed = !!snap && snap.exists() && snap.data().actif === true;
        } catch { allowed = false; }
        if (allowed) { setUser(u); setAccessDenied(null); }
        else {
          setAccessDenied(u.email || "");
          await signOut(auth); setUser(null);
        }
      } else { setUser(null); }
      setIsAuthLoading(false);
    });
    return () => unsub();
  }, []);

  // --- CHARGEMENT DES DONNÉES ---
  useEffect(() => {
    if (!user) return;
    const unsubProd = onSnapshot(query(collection(db, "produits"), orderBy("createdAt", "desc")), (snap) => {
      setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubOrders = onSnapshot(query(collection(db, "orders"), orderBy("createdAt", "desc")), (snap) => {
      setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubCats = onSnapshot(collection(db, "categories"), (snap) => {
      setCategoriesData(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubSettings = onSnapshot(doc(db, "settings", "delivery"), (snap) => {
      if (snap.exists()) setDeliverySettings(snap.data());
    });
    return () => { unsubProd(); unsubOrders(); unsubCats(); unsubSettings(); };
  }, [user]);

  // --- LOGIQUE SOUS-CATÉGORIES DYNAMIQUES ---
  useEffect(() => {
    const found = categoriesData.find(c => c.id === selectedParentCat);
    setAvailableSubs(found?.subs || []);
  }, [selectedParentCat, categoriesData]);

  // --- RÉCUPÉRATION DU BLOG LIÉ LORS DE L'ÉDITION ---
  useEffect(() => {
    if (editingProduct) {
      const q = query(collection(db, "articles_blog"), where("productId", "==", editingProduct.id));
      const unsub = onSnapshot(q, (snap) => {
        if (!snap.empty) setLinkedBlog({ id: snap.docs[0].id, ...snap.docs[0].data() });
        else setLinkedBlog(null);
      });
      return () => unsub();
    }
  }, [editingProduct]);

  // --- GESTION DES FICHIERS (CORRECTIF) ---
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setSelectedFiles(prev => [...prev, ...filesArray]);

      const newPreviews = filesArray.map(file => URL.createObjectURL(file));
      setPreviews(prev => [...prev, ...newPreviews]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  // --- ACTIONS ---
  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    setIsUploading(true);
    try {
      await updateDoc(doc(db, "produits", editingProduct.id), {
        name: editingProduct.name,
        price: Number(editingProduct.price),
        stock: Number(editingProduct.stock),
        description: editingProduct.description || "",
        matieres: editingProduct.matieres || "",
        dimensions: editingProduct.dimensions || "",
        status: editingProduct.status || "draft"
      });
      if (linkedBlog) {
        await updateDoc(doc(db, "articles_blog", linkedBlog.id), {
          content: linkedBlog.content,
          status: editingProduct.status
        });
      }
      setEditingProduct(null);
    } catch (err) { alert("Erreur lors de la mise à jour."); }
    finally { setIsUploading(false); }
  };

  const handleAddProduct = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (selectedFiles.length === 0) { alert("Veuillez ajouter au moins une image."); return; }
    setIsUploading(true);
    const formData = new FormData(e.currentTarget);
    try {
      const imageUrls = [];
      for (const file of selectedFiles) {
        const sRef = ref(storage, `produits/${Date.now()}_${file.name}`);
        const uploadTask = uploadBytesResumable(sRef, file);
        await new Promise((resolve, reject) => {
          uploadTask.on('state_changed', 
            (snap) => setUploadProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)), 
            reject, 
            async () => {
              imageUrls.push(await getDownloadURL(uploadTask.snapshot.ref));
              resolve(true);
            }
          );
        });
      }
      await addDoc(collection(db, "produits"), {
        name: formData.get('name'),
        price: parseFloat(formData.get('price') as string),
        stock: parseInt(formData.get('stock') as string),
        category: selectedParentCat,
        subCategory: formData.get('subCategory') || "",
        matieres: formData.get('matieres'),
        dimensions: formData.get('dimensions'),
        seo_tags: formData.get('seo_tags'),
        images: imageUrls,
        agentProcessed: false,
        status: "draft",
        createdAt: serverTimestamp(),
      });
      setShowAddModal(false);
      setPreviews([]); setSelectedFiles([]); setSelectedParentCat("");
    } catch (error) { alert("Erreur d'ajout."); } finally { setIsUploading(false); }
  };

  if (isAuthLoading) return <div className="min-h-screen flex items-center justify-center bg-[#F5F2EE]"><Loader2 className="animate-spin opacity-20" /></div>;
  if (!user) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-[#F5F2EE] px-6">
      <button onClick={() => { setAccessDenied(null); setLoginError(null); signInWithPopup(auth, new GoogleAuthProvider()).catch((err) => setLoginError(loginErrorMessage(err?.code))); }} className="border border-black px-8 py-4 uppercase text-[10px] tracking-widest">S'identifier</button>
      {loginError && (
        <p className="text-[10px] uppercase tracking-widest text-center max-w-xs leading-relaxed" style={{ color: styles.mutedInk }}>
          {loginError}
        </p>
      )}
      {accessDenied !== null && (
        <p className="text-[10px] uppercase tracking-widest text-center max-w-xs leading-relaxed" style={{ color: styles.mutedInk }}>
          Ce compte{accessDenied ? ` (${accessDenied})` : ''} n'a pas accès à l'espace créatrice.
        </p>
      )}
    </div>
  );

  return (
    <div className="min-h-screen pb-24 font-sans" style={{ backgroundColor: styles.cream, color: styles.ink }}>
      {/* HEADER */}
      <header className="sticky top-0 z-50 bg-white border-b px-6 py-4 flex justify-between items-center" style={{ borderColor: styles.border }}>
        <span className="font-serif text-xl tracking-widest uppercase italic text-black">Atelier</span>
        <button onClick={() => signOut(auth)} className="text-black opacity-60 hover:opacity-100 transition-opacity"><LogOut size={18} strokeWidth={1.5} /></button>
      </header>

      {/* NAVIGATION */}
      <nav className="sticky top-[61px] z-40 bg-white border-b flex justify-around" style={{ borderColor: styles.border }}>
        {[
          { id: 'orders', label: 'Commandes', icon: ShoppingBag },
          { id: 'inventory', label: 'Inventaire', icon: Package },
          { id: 'customers', label: 'Clients', icon: Users },
          { id: 'settings', label: 'Réglages', icon: Settings },
        ].map((tab) => (
          <button 
            key={tab.id} 
            onClick={() => setActiveTab(tab.id as any)} 
            className={`flex flex-col items-center py-3 px-4 transition-all border-b-2 ${activeTab === tab.id ? 'border-black opacity-100' : 'border-transparent opacity-40'}`}
          >
            <tab.icon size={16} strokeWidth={1.5} />
            <span className="text-[7px] uppercase tracking-[0.2em] mt-1 font-bold">{tab.label}</span>
          </button>
        ))}
      </nav>

      <main className="max-w-md mx-auto p-6">
        {/* INVENTAIRE */}
        {activeTab === 'inventory' && (
          <div className="space-y-6 animate-in fade-in">
            <button 
                onClick={() => setShowAddModal(true)} 
                className="w-full py-5 border border-dashed border-neutral-400 text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 bg-white hover:bg-neutral-50 transition-all font-bold"
            >
              <Plus size={14} /> Ajouter une pièce unique
            </button>
            <div className="grid gap-3">
              {products.map(product => (
                <div 
                    key={product.id} 
                    onClick={() => setEditingProduct(product)} 
                    className="bg-white border p-3 flex items-center gap-4 cursor-pointer hover:shadow-md transition-all group" 
                    style={{ borderColor: styles.border }}
                >
                  <div className="relative flex-shrink-0">
                    <img src={product.images?.[0]} className="w-16 h-20 object-cover" alt="" />
                    {product.status === 'draft' && (
                      <div className="absolute top-1 left-1 bg-black text-white text-[6px] px-1 py-0.5 tracking-tighter uppercase font-bold">Brouillon</div>
                    )}
                  </div>
                  <div className="flex-grow min-w-0">
                    <p className="text-[7px] uppercase tracking-[0.2em] font-bold mb-1" style={{ color: styles.mutedInk }}>{product.category} · {product.subCategory}</p>
                    <h4 className="text-[12px] font-serif italic truncate text-black">{product.name}</h4>
                    <p className="text-[10px] mt-1 font-medium text-black">
                        {product.price}€ · <span className={product.stock === 0 ? "text-red-600 font-bold" : "opacity-60"}>{product.stock === 0 ? 'Épuisé' : `Stock: ${product.stock}`}</span>
                    </p>
                  </div>
                  <ChevronRight size={14} className="opacity-40 group-hover:opacity-100 transition-opacity" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* RÉGLAGES */}
        {activeTab === 'settings' && (
          <div className="space-y-8 animate-in fade-in">
             <div className="flex items-center gap-3 mb-6" style={{ color: styles.mutedInk }}>
                <Truck size={18} />
                <span className="text-[10px] uppercase tracking-[0.3em] font-bold">Politique de Livraison</span>
             </div>
             <form onSubmit={(e) => { e.preventDefault(); setDoc(doc(db, "settings", "delivery"), deliverySettings); alert("Mis à jour"); }} className="space-y-8">
                <div className="space-y-6 bg-white p-6 border shadow-sm" style={{ borderColor: styles.border }}>
                    <div className="space-y-2">
                        <label className="text-[8px] uppercase tracking-widest font-bold" style={{ color: styles.mutedInk }}>Seuil de gratuité (€)</label>
                        <input type="number" value={deliverySettings.freeThreshold} onChange={e => setDeliverySettings({...deliverySettings, freeThreshold: parseFloat(e.target.value)})} className="w-full border-b py-2 text-sm outline-none font-medium text-black bg-transparent" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[8px] uppercase tracking-widest font-bold" style={{ color: styles.mutedInk }}>Frais forfaitaires (€)</label>
                        <input type="number" value={deliverySettings.flatRate} onChange={e => setDeliverySettings({...deliverySettings, flatRate: parseFloat(e.target.value)})} className="w-full border-b py-2 text-sm outline-none font-medium text-black bg-transparent" />
                    </div>
                </div>
                <button type="submit" className="w-full bg-black text-white py-4 text-[10px] uppercase tracking-[0.3em] font-bold">Mettre à jour les réglages</button>
             </form>
          </div>
        )}
      </main>

      {/* --- MODALE ÉDITION --- */}
      {editingProduct && (
        <div className="fixed inset-0 z-[110] bg-white p-6 flex flex-col overflow-hidden animate-in slide-in-from-right duration-300">
          <div className="flex justify-between items-center mb-8 border-b pb-4">
            <span className="text-[10px] uppercase tracking-[0.4em] font-bold italic text-black">Révision de la pièce</span>
            <button onClick={() => setEditingProduct(null)} className="p-2 hover:bg-neutral-100 rounded-full"><X size={24} strokeWidth={1.5} /></button>
          </div>

          <form onSubmit={handleUpdateProduct} className="flex-grow overflow-y-auto space-y-10 pb-32 no-scrollbar px-2">
            <div className="relative group">
                <img src={editingProduct.images?.[0]} className="w-full h-72 object-cover border rounded-sm shadow-sm" alt="" />
                <div className="absolute bottom-4 left-4 flex gap-2">
                     <span className={`text-[8px] px-3 py-1.5 uppercase tracking-widest font-bold shadow-lg ${editingProduct.status === 'published' ? 'bg-white text-black' : 'bg-black text-white'}`}>
                        {editingProduct.status === 'published' ? 'En ligne' : 'Brouillon IA'}
                    </span>
                </div>
            </div>
            
            <div className="space-y-8">
              <div className="space-y-2">
                <label className="text-[8px] uppercase tracking-widest font-bold" style={{ color: styles.mutedInk }}>Identité du modèle</label>
                <input 
                    value={editingProduct.name} 
                    onChange={e => setEditingProduct({...editingProduct, name: e.target.value.toUpperCase()})} 
                    className="w-full border-b border-black pb-2 text-xl font-serif italic outline-none uppercase text-black bg-transparent" 
                />
              </div>

              <div className="flex gap-8">
                <div className="flex-grow space-y-2">
                    <label className="text-[8px] uppercase tracking-widest font-bold" style={{ color: styles.mutedInk }}>Prix (€)</label>
                    <input type="number" value={editingProduct.price} onChange={e => setEditingProduct({...editingProduct, price: e.target.value})} className="w-full border-b border-black pb-2 text-base outline-none font-medium text-black bg-transparent" />
                </div>
                <div className="flex-grow space-y-2">
                    <label className="text-[8px] uppercase tracking-widest font-bold" style={{ color: styles.mutedInk }}>Quantité</label>
                    <input type="number" value={editingProduct.stock} onChange={e => setEditingProduct({...editingProduct, stock: e.target.value})} className="w-full border-b border-black pb-2 text-base outline-none font-medium text-black bg-transparent" />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[8px] uppercase tracking-widest font-bold" style={{ color: styles.mutedInk }}>Description Fiche Produit (IA)</label>
                <textarea 
                    value={editingProduct.description} 
                    onChange={e => setEditingProduct({...editingProduct, description: e.target.value})} 
                    className="w-full border border-neutral-300 p-4 text-[11px] min-h-[140px] outline-none leading-relaxed italic bg-neutral-50 text-black font-serif" 
                />
              </div>

              {linkedBlog && (
                <div className="space-y-4 p-6 bg-white border border-black shadow-inner">
                    <div className="flex items-center justify-between">
                        <label className="text-[10px] uppercase tracking-[0.2em] font-bold flex items-center gap-2 text-black">
                            <Edit3 size={14}/> Article Blog (Storytelling IA)
                        </label>
                        <Eye size={14} className="opacity-40" />
                    </div>
                    <textarea 
                        value={linkedBlog.content} 
                        onChange={e => setLinkedBlog({...linkedBlog, content: e.target.value})} 
                        className="w-full border-none p-0 text-[11px] min-h-[400px] outline-none leading-relaxed font-serif text-black resize-none" 
                    />
                </div>
              )}
            </div>

            <div className="fixed bottom-0 left-0 right-0 p-6 bg-white border-t border-neutral-200 flex gap-3 shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
              <button 
                type="button" 
                onClick={() => setEditingProduct({...editingProduct, status: editingProduct.status === 'published' ? 'draft' : 'published'})} 
                className="flex-grow py-4 text-[10px] uppercase tracking-widest border border-black font-bold hover:bg-neutral-50"
              >
                {editingProduct.status === 'published' ? "Remettre en brouillon" : "Approuver pour mise en ligne"}
              </button>
              <button 
                type="submit" 
                className="flex-grow bg-black text-white py-4 text-[10px] uppercase tracking-widest font-bold flex items-center justify-center gap-2 hover:bg-neutral-900 transition-colors"
              >
                {isUploading ? <Loader2 size={16} className="animate-spin" /> : <><CheckCircle size={16}/> Enregistrer</>}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODALE AJOUT */}
      {showAddModal && (
        <div className="fixed inset-0 z-[120] bg-white p-6 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="flex justify-between items-center mb-10">
            <span className="text-[10px] uppercase tracking-[0.4em] font-bold italic text-black">Nouvelle Création</span>
            <button onClick={() => setShowAddModal(false)} className="p-2"><X size={26} strokeWidth={1} /></button>
          </div>

          <form onSubmit={handleAddProduct} className="flex-grow space-y-8 overflow-y-auto pb-24 no-scrollbar px-2">
            <div className="flex gap-4 overflow-x-auto pb-4 snap-x scroll-px-4">
                {previews.map((src, i) => (
                    <div key={i} className="relative flex-shrink-0 snap-start">
                        <img src={src} className="w-36 h-48 object-cover border shadow-sm" alt="" />
                        <button type="button" onClick={() => removeFile(i)} className="absolute -top-2 -right-2 bg-black text-white p-1.5 rounded-full shadow-lg border border-white"><X size={10}/></button>
                    </div>
                ))}
                <button type="button" onClick={() => fileInputRef.current?.click()} className="w-36 h-48 border-2 border-dashed border-neutral-300 flex flex-col items-center justify-center text-neutral-400 bg-neutral-50 hover:bg-white transition-colors">
                    <Camera size={28} strokeWidth={1} />
                    <span className="text-[8px] mt-2 font-bold tracking-widest">CAPTURES</span>
                </button>
                <input type="file" ref={fileInputRef} hidden multiple accept="image/*" capture="environment" onChange={handleFileSelect} />
            </div>

            <div className="space-y-10">
              <div className="space-y-2">
                <label className="text-[8px] uppercase tracking-widest font-bold" style={{ color: styles.mutedInk }}>Modèle</label>
                <input name="name" placeholder="NOM DE LA PIÈCE" className="w-full border-b border-black pb-2 text-base outline-none bg-transparent uppercase text-black font-medium" required />
              </div>
              
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[8px] uppercase tracking-widest font-bold" style={{ color: styles.mutedInk }}>Univers</label>
                  <select 
                    value={selectedParentCat} 
                    onChange={(e) => setSelectedParentCat(e.target.value)} 
                    className="w-full border-b border-black pb-2 text-[11px] uppercase outline-none bg-transparent text-black font-bold cursor-pointer" 
                    required
                  >
                    <option value="">SÉLECTIONNER</option>
                    {categoriesData.map(cat => <option key={cat.id} value={cat.id}>{cat.id.toUpperCase()}</option>)}
                  </select>
                </div>
                {availableSubs.length > 0 && (
                  <div className="space-y-2 animate-in slide-in-from-left duration-500">
                    <label className="text-[8px] uppercase tracking-widest font-bold" style={{ color: styles.mutedInk }}>Famille</label>
                    <select name="subCategory" className="w-full border-b border-black pb-2 text-[11px] uppercase outline-none bg-transparent text-black font-bold cursor-pointer" required>
                      <option value="">SÉLECTIONNER</option>
                      {availableSubs.map(sub => <option key={sub} value={sub}>{sub.toUpperCase()}</option>)}
                    </select>
                  </div>
                )}
              </div>

              <div className="flex gap-8">
                <div className="flex-grow space-y-2">
                    <label className="text-[8px] uppercase tracking-widest font-bold" style={{ color: styles.mutedInk }}>Prix (€)</label>
                    <input name="price" type="number" placeholder="0.00" className="w-full border-b border-black pb-2 text-base outline-none bg-transparent text-black" required />
                </div>
                <div className="flex-grow space-y-2">
                    <label className="text-[8px] uppercase tracking-widest font-bold" style={{ color: styles.mutedInk }}>Stock</label>
                    <input name="stock" type="number" placeholder="1" className="w-full border-b border-black pb-2 text-base outline-none bg-transparent text-black" required />
                </div>
              </div>
              
              <div className="space-y-6 pt-6 border-t border-neutral-100">
                <div className="space-y-2">
                    <label className="text-[8px] uppercase tracking-widest font-bold" style={{ color: styles.mutedInk }}>Matières</label>
                    <input name="matieres" placeholder="COMPOSITION" className="w-full border-b border-black pb-2 text-[11px] outline-none italic text-black bg-transparent" />
                </div>
                <div className="space-y-2">
                    <label className="text-[8px] uppercase tracking-widest font-bold" style={{ color: styles.mutedInk }}>Dimensions</label>
                    <input name="dimensions" placeholder="L X H X P" className="w-full border-b border-black pb-2 text-[11px] outline-none italic text-black bg-transparent" />
                </div>
              </div>
            </div>

            <button type="submit" disabled={isUploading} className="w-full bg-black text-white py-6 text-[10px] uppercase tracking-[0.4em] font-bold flex items-center justify-center gap-3 active:scale-95 transition-transform shadow-xl">
              {isUploading ? <><Loader2 size={16} className="animate-spin" /> {uploadProgress}%</> : "Lancer l'Intelligence Créatrice"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default Dashboard;