"use client";

import { PlusIcon, SparklesIcon, XIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useNow } from "@/hooks/use-now";
import {
  discardDraft,
  draftIssues,
  openSpace,
  updateDraft,
} from "@/lib/dashboard/actions";
import type { DraftField, Space } from "@/lib/dashboard/types";
import { cn } from "@/lib/utils";

const HIGHLIGHT_MS = 4000;

export function DraftEditor({ space }: { space: Space }) {
  const now = useNow(1000);
  const { lastPatched } = space.shaping;
  const issues = draftIssues(space);

  const patched = (field: DraftField) =>
    lastPatched.fields.includes(field) && now - lastPatched.at < HIGHLIGHT_MS;

  return (
    <Card className="gap-0 py-0 lg:h-[calc(100dvh-11rem)]">
      <CardHeader className="border-b py-3">
        <CardTitle>Draft</CardTitle>
        <CardDescription>
          The Master fills this in as you talk. You can edit it directly.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-5 overflow-y-auto py-4">
        <DraftField label="Title" highlighted={patched("title")}>
          <Input
            value={space.title}
            placeholder="e.g. May trip 2027"
            onChange={(event) => updateDraft(space.id, { title: event.target.value })}
          />
        </DraftField>

        <DraftField
          label="Goal"
          description="When is the problem solved? The Master closes the space once this is reached."
          highlighted={patched("goal")}
        >
          <Textarea
            rows={2}
            value={space.goal}
            onChange={(event) => updateDraft(space.id, { goal: event.target.value })}
          />
        </DraftField>

        <DraftField
          label="Subproblems"
          description="The Master goes through them one by one with the agents."
          highlighted={patched("subproblems")}
        >
          <EditableList
            items={space.subproblems.map((s) => s.title)}
            placeholder="Add a subproblem"
            onChange={(subproblems) => updateDraft(space.id, { subproblems })}
          />
        </DraftField>

        <DraftField
          label="Constraints"
          description="Facts every agent should respect."
          highlighted={patched("constraints")}
        >
          <EditableList
            items={space.constraints}
            placeholder="Add a constraint"
            onChange={(constraints) => updateDraft(space.id, { constraints })}
          />
        </DraftField>

        <DraftField label="Decide by" highlighted={patched("deadline")}>
          <Input
            type="date"
            className="w-fit"
            value={space.deadline ?? ""}
            onChange={(event) =>
              updateDraft(space.id, { deadline: event.target.value || undefined })
            }
          />
        </DraftField>

        <DraftField label="Original description" highlighted={patched("description")}>
          <Textarea
            rows={3}
            value={space.description}
            onChange={(event) => updateDraft(space.id, { description: event.target.value })}
          />
        </DraftField>
      </CardContent>

      <CardFooter className="flex-col items-stretch gap-2">
        {issues.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Still needed: {issues.join(", ")}.
          </p>
        )}
        <div className="flex justify-between gap-2">
          <DiscardDraftButton spaceId={space.id} />
          <Button disabled={issues.length > 0} onClick={() => openSpace(space.id)}>
            Open the space and invite
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}

function DraftField({
  label,
  description,
  highlighted,
  children,
}: {
  label: string;
  description?: string;
  highlighted: boolean;
  children: React.ReactNode;
}) {
  return (
    <Field
      className={cn(
        "-m-2 rounded-lg p-2 transition-colors duration-700",
        highlighted && "bg-amber-50 ring-1 ring-amber-300 dark:bg-amber-950/30 dark:ring-amber-700",
      )}
    >
      <div className="flex items-center gap-2">
        <FieldLabel>{label}</FieldLabel>
        {highlighted && (
          <Badge variant="outline" className="border-amber-300 text-amber-700 dark:text-amber-300">
            <SparklesIcon />
            Updated by the Master
          </Badge>
        )}
      </div>
      {children}
      {description && <FieldDescription>{description}</FieldDescription>}
    </Field>
  );
}

function EditableList({
  items,
  placeholder,
  onChange,
}: {
  items: string[];
  placeholder: string;
  onChange: (items: string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  function add() {
    if (!draft.trim()) return;
    onChange([...items, draft.trim()]);
    setDraft("");
  }

  return (
    <div className="flex flex-col gap-1.5">
      {items.map((item, i) => (
        // Items can be renamed while typing, so the index is the stable key.
        <div key={i} className="flex gap-1.5">
          <Input
            value={item}
            onChange={(event) =>
              onChange(items.map((other, j) => (j === i ? event.target.value : other)))
            }
          />
          <Button
            variant="ghost"
            size="icon"
            aria-label="Remove"
            onClick={() => onChange(items.filter((_, j) => j !== i))}
          >
            <XIcon />
          </Button>
        </div>
      ))}
      <div className="flex gap-1.5">
        <Input
          value={draft}
          placeholder={placeholder}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") add();
          }}
        />
        <Button variant="outline" size="icon" aria-label={placeholder} onClick={add}>
          <PlusIcon />
        </Button>
      </div>
    </div>
  );
}

function DiscardDraftButton({ spaceId }: { spaceId: string }) {
  const router = useRouter();
  return (
    <Dialog>
      <DialogTrigger render={<Button variant="ghost" />}>Discard</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Discard this draft?</DialogTitle>
          <DialogDescription>
            The draft and your chat with the Master are deleted. Nobody was
            invited yet.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Keep it</DialogClose>
          <Button
            variant="destructive"
            onClick={() => {
              router.push("/spaces");
              discardDraft(spaceId);
            }}
          >
            Discard
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
