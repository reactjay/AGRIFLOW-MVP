import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, X, ImageIcon } from 'lucide-react';
import { supplyService } from '../services/supplyService';
import { storageService, STORE_KEYS } from '../services/storageService';
import { useApp } from '../context/AppContext';
import { useToast } from '../components/ui/Toast';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { Input, Select, Textarea } from '../components/ui/Input';
import type { CommodityType, QualityGrade } from '../types';

const MAX_PHOTOS = 3;
const MAX_SIZE_MB = 5;

export function CreateSupplyPage() {
  const navigate = useNavigate();
  const { session } = useApp();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    commodity: 'maize' as CommodityType,
    quantity: '', unit: 'tonnes',
    qualityGrade: 'A' as QualityGrade,
    pricePerUnit: '',
    location: '',
    availabilityDate: '',
    description: '',
  });

  const users = storageService.get<import('../types').User[]>(STORE_KEYS.USERS) ?? [];
  const user = users.find((u) => u.id === session?.userId);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const processFiles = (files: FileList | null) => {
    if (!files) return;
    const remaining = MAX_PHOTOS - photos.length;
    if (remaining <= 0) { toast('error', `Maximum ${MAX_PHOTOS} photos allowed.`); return; }
    Array.from(files).slice(0, remaining).forEach((file) => {
      if (!file.type.startsWith('image/')) { toast('error', `${file.name} is not an image.`); return; }
      if (file.size > MAX_SIZE_MB * 1024 * 1024) { toast('error', `${file.name} exceeds ${MAX_SIZE_MB}MB limit.`); return; }
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        setPhotos((prev) => prev.length < MAX_PHOTOS ? [...prev, dataUrl] : prev);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;
    if (!form.quantity || !form.pricePerUnit || !form.location || !form.availabilityDate) {
      toast('error', 'Please fill all required fields.');
      return;
    }
    setLoading(true);
    try {
      const l = await supplyService.create({
        supplierId: session.userId,
        supplierName: user?.organizationName ?? session.name,
        supplierVerified: user?.verified ?? false,
        commodity: form.commodity,
        quantity: Number(form.quantity),
        unit: form.unit,
        qualityGrade: form.qualityGrade,
        pricePerUnit: Number(form.pricePerUnit),
        currency: 'NGN',
        location: form.location,
        availabilityDate: new Date(form.availabilityDate).toISOString(),
        description: form.description,
        photos: photos.length > 0 ? photos : undefined,
      });
      toast('success', `Listing ${l.id} published.`);
      navigate('/app/supply/manage');
    } catch (e: unknown) {
      toast('error', e instanceof Error ? e.message : 'Failed to publish listing.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-1.5 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-4 h-4 text-gray-500" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Create Supply Listing</h1>
          <p className="text-sm text-gray-500">Publish your available agricultural supply for buyers to discover.</p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid sm:grid-cols-2 gap-4">
              <Select label="Commodity" value={form.commodity} onChange={(e) => set('commodity', e.target.value)} required>
                <option value="maize">Yellow Maize</option>
                <option value="rice">Rice</option>
                <option value="soybean">Soybean</option>
                <option value="sorghum">White Sorghum</option>
                <option value="beans">Beans</option>
                <option value="yam">Yam</option>
                <option value="wheat">Wheat</option>
                <option value="cassava">Cassava</option>
              </Select>
              <Select label="Quality Grade" value={form.qualityGrade} onChange={(e) => set('qualityGrade', e.target.value)} required>
                <option value="A">Grade A (Premium)</option>
                <option value="B">Grade B (Standard)</option>
                <option value="C">Grade C (Commercial)</option>
              </Select>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <Input label="Quantity" type="number" required min="1" value={form.quantity} onChange={(e) => set('quantity', e.target.value)} placeholder="e.g. 50" />
              <Select label="Unit" value={form.unit} onChange={(e) => set('unit', e.target.value)}>
                <option value="tonnes">Tonnes (MT)</option>
                <option value="bags (50kg)">Bags (50kg)</option>
                <option value="bags (100kg)">Bags (100kg)</option>
                <option value="bags (25kg)">Bags (25kg)</option>
                <option value="kg">Kilograms (kg)</option>
                <option value="crates">Crates</option>
                <option value="baskets">Baskets</option>
              </Select>
            </div>

            <Input
              label="Price per Unit (₦)" type="number" required min="1"
              value={form.pricePerUnit} onChange={(e) => set('pricePerUnit', e.target.value)}
              placeholder="e.g. 850000"
              hint="Price in Nigerian Naira per selected unit"
            />

            <Input
              label="Location / Origin" required
              value={form.location} onChange={(e) => set('location', e.target.value)}
              placeholder="e.g. Kaduna, Nigeria"
            />

            <Input
              label="Availability Date" type="date" required
              value={form.availabilityDate} onChange={(e) => set('availabilityDate', e.target.value)}
            />

            <Textarea
              label="Description"
              value={form.description} onChange={(e) => set('description', e.target.value)}
              rows={4}
              placeholder="Quality details, processing method, certifications, collection instructions..."
            />

            {/* Photo Upload */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-gray-700">
                  Commodity Photos <span className="text-gray-400 font-normal">(optional, up to {MAX_PHOTOS})</span>
                </label>
                {photos.length > 0 && (
                  <span className="text-[11px] text-gray-400">{photos.length}/{MAX_PHOTOS} uploaded</span>
                )}
              </div>

              {/* Drop zone */}
              {photos.length < MAX_PHOTOS && (
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => { e.preventDefault(); setDragOver(false); processFiles(e.dataTransfer.files); }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-lg px-4 py-6 flex flex-col items-center gap-2 cursor-pointer transition-colors ${
                    dragOver ? 'border-agri-500 bg-agri-50' : 'border-gray-200 hover:border-agri-400 hover:bg-gray-50'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                    <Upload className="w-4 h-4 text-gray-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-700">Drop photos here or click to browse</p>
                    <p className="text-xs text-gray-400 mt-0.5">JPG, PNG, WEBP · Max {MAX_SIZE_MB}MB each</p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => processFiles(e.target.files)}
                  />
                </div>
              )}

              {/* Previews */}
              {photos.length > 0 && (
                <div className="flex gap-3 mt-3 flex-wrap">
                  {photos.map((src, i) => (
                    <div key={i} className="relative group w-24 h-24 rounded-lg overflow-hidden border border-gray-200 bg-gray-50 shrink-0">
                      <img src={src} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setPhotos((prev) => prev.filter((_, idx) => idx !== i))}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-gray-900/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Remove photo"
                      >
                        <X className="w-3 h-3" />
                      </button>
                      {i === 0 && (
                        <span className="absolute bottom-1 left-1 text-[9px] bg-agri-700 text-white px-1 py-0.5 rounded font-semibold">
                          COVER
                        </span>
                      )}
                    </div>
                  ))}
                  {photos.length < MAX_PHOTOS && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-24 h-24 rounded-lg border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-1 text-gray-400 hover:border-agri-400 hover:text-agri-600 transition-colors shrink-0"
                    >
                      <ImageIcon className="w-4 h-4" />
                      <span className="text-[10px] font-medium">Add more</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" type="button" onClick={() => navigate(-1)}>Cancel</Button>
              <Button type="submit" loading={loading}>Publish Listing</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
