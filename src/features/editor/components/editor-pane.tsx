import type { CodeEditorHandle } from "@/components/code-editor";
import { CodeEditor } from "@/components/code-editor";
import { ChallengeBanner } from "@/features/challenges/components/challenge-banner";
import { getChallengeById, challenges } from "@/lib/pseint/challenges";
import type { FileTab } from "@/features/editor/hooks/useTabs";

interface EditorPaneProps {
  activeTab: FileTab;
  editorRef: { current: CodeEditorHandle | null };
  errorLines: number[];
  highlightVariable: { name: string; line?: number } | null;
  debugActive: boolean;
  debugLine: number | null;
  fontSize: number;
  editorFont: string;
  onChange: (content: string) => void;
  onUndo: () => void;
  onRedo: () => void;
}

export const EditorPane = ({
  activeTab,
  editorRef,
  errorLines,
  highlightVariable,
  debugActive,
  debugLine,
  fontSize,
  editorFont,
  onChange,
  onUndo,
  onRedo,
}: EditorPaneProps) => {
  return (
    <section className="flex min-h-0 flex-1 flex-col border-b border-border lg:border-b-0">
      {activeTab.isChallenge && activeTab.challengeId && (
        <ChallengeBanner
          challenge={
            getChallengeById(activeTab.challengeId) ?? challenges[0]
          }
        />
      )}
      <div className="min-h-0 flex-1">
        <CodeEditor
          ref={editorRef}
          value={activeTab.content}
          onChange={onChange}
          errorLines={errorLines}
          onUndo={onUndo}
          onRedo={onRedo}
          highlightVariable={highlightVariable}
          highlightLine={debugActive ? debugLine : null}
          fontSize={fontSize}
          editorFont={editorFont}
        />
      </div>
    </section>
  );
};
