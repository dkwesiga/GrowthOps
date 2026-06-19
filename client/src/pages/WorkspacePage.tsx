import { useWorkspace } from "@/contexts/WorkspaceContext";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Briefcase, Edit3, Globe, MapPin, Phone, Save, X } from "lucide-react";

interface FieldEditorProps {
  label: string;
  value: string | null | undefined;
  multiline?: boolean;
  onSave: (val: string) => void;
}

function FieldEditor({ label, value, multiline, onSave }: FieldEditorProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");

  const handleSave = () => {
    onSave(draft);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">{label}</Label>
        {multiline ? (
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="min-h-[80px] text-sm"
            autoFocus
          />
        ) : (
          <Input value={draft} onChange={(e) => setDraft(e.target.value)} className="text-sm" autoFocus />
        )}
        <div className="flex gap-2">
          <Button size="sm" onClick={handleSave} className="h-7 text-xs">
            <Save className="w-3 h-3 mr-1" /> Save
          </Button>
          <Button size="sm" variant="ghost" onClick={() => { setDraft(value ?? ""); setEditing(false); }} className="h-7 text-xs">
            <X className="w-3 h-3 mr-1" /> Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="group">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="flex items-start gap-2 mt-1">
        <p className="text-sm flex-1 leading-relaxed">{value || <span className="text-muted-foreground italic">Not set</span>}</p>
        <button
          onClick={() => { setDraft(value ?? ""); setEditing(true); }}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary flex-shrink-0"
        >
          <Edit3 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

export default function WorkspacePage() {
  const { activeWorkspace } = useWorkspace();
  const wsId = activeWorkspace?.id ?? 0;
  const utils = trpc.useUtils();

  const { data: profile, isLoading } = trpc.brandProfile.get.useQuery(
    { workspaceId: wsId },
    { enabled: !!wsId }
  );

  const updateMutation = trpc.brandProfile.update.useMutation({
    onSuccess: () => {
      utils.brandProfile.get.invalidate({ workspaceId: wsId });
      toast.success("Brand profile updated");
    },
    onError: (e) => toast.error(e.message),
  });

  const handleUpdate = (field: string, value: string) => {
    updateMutation.mutate({ workspaceId: wsId, [field]: value });
  };

  if (!activeWorkspace) return null;

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-primary" />
            Brand Profile
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {activeWorkspace.name} — hover any field to edit
          </p>
        </div>
        <Badge className={activeWorkspace.type === "b2b_saas" ? "badge-approved" : "badge-active"}>
          {activeWorkspace.type?.replace(/_/g, " ")}
        </Badge>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Identity */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-primary" /> Brand Identity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FieldEditor label="Brand Name" value={profile?.brandName} onSave={(v) => handleUpdate("brandName", v)} />
              <FieldEditor label="Business Type" value={profile?.businessType} onSave={(v) => handleUpdate("businessType", v)} />
              <FieldEditor label="Geographic Focus" value={profile?.geographicFocus} onSave={(v) => handleUpdate("geographicFocus", v)} />
              <FieldEditor label="Contact Info" value={profile?.contactInfo} multiline onSave={(v) => handleUpdate("contactInfo", v)} />
            </CardContent>
          </Card>

          {/* Web & SEO */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Globe className="w-4 h-4 text-primary" /> Web & SEO
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FieldEditor label="Website URL" value={profile?.website} onSave={(v) => handleUpdate("website", v)} />
              <FieldEditor label="Seed Keywords" value={profile?.seedKeywords} multiline onSave={(v) => handleUpdate("seedKeywords", v)} />
              <FieldEditor label="Competitors" value={profile?.competitors} multiline onSave={(v) => handleUpdate("competitors", v)} />
            </CardContent>
          </Card>

          {/* Audience */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Phone className="w-4 h-4 text-primary" /> Audience & Positioning
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FieldEditor label="Target Audience" value={profile?.audience} multiline onSave={(v) => handleUpdate("audience", v)} />
              <FieldEditor label="Pain Points" value={profile?.painPoints} multiline onSave={(v) => handleUpdate("painPoints", v)} />
              <FieldEditor label="Offers" value={profile?.offers} multiline onSave={(v) => handleUpdate("offers", v)} />
              <FieldEditor label="CTAs" value={profile?.ctas} onSave={(v) => handleUpdate("ctas", v)} />
            </CardContent>
          </Card>

          {/* Services */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" /> Services & Voice
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FieldEditor label="Services / Products" value={profile?.servicesOrProducts} multiline onSave={(v) => handleUpdate("servicesOrProducts", v)} />
              <FieldEditor label="Brand Voice / Tone" value={profile?.toneOfVoice} multiline onSave={(v) => handleUpdate("toneOfVoice", v)} />
            </CardContent>
          </Card>

          {/* Compliance */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-yellow-400 flex items-center gap-2">
                ⚠ Compliance & Prohibited Claims
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FieldEditor label="Prohibited Claims" value={profile?.prohibitedClaims} multiline onSave={(v) => handleUpdate("prohibitedClaims", v)} />
              <FieldEditor label="Compliance Notes" value={profile?.complianceNotes} multiline onSave={(v) => handleUpdate("complianceNotes", v)} />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
