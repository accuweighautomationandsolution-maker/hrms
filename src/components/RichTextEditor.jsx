import React, { useRef, useEffect } from 'react';
import { Bold, Italic, Underline, List, ListOrdered, AlignLeft, AlignCenter, AlignRight, Type } from 'lucide-react';

const RichTextEditor = ({ value, onChange, height = '400px' }) => {
    const editorRef = useRef(null);

    // Sync initial value only
    useEffect(() => {
        if (editorRef.current && editorRef.current.innerHTML !== value) {
            editorRef.current.innerHTML = value || '';
        }
    }, []);

    const execCommand = (command, value = null) => {
        document.execCommand(command, false, value);
        if (editorRef.current) {
            onChange(editorRef.current.innerHTML);
        }
    };

    const handleInput = () => {
        if (editorRef.current) {
            onChange(editorRef.current.innerHTML);
        }
    };

    return (
        <div style={{ border: '1px solid var(--color-border)', borderRadius: '8px', overflow: 'hidden', display: 'flex', flexDirection: 'column', backgroundColor: 'white' }}>
            {/* Toolbar */}
            <div style={{ 
                padding: '0.5rem', 
                backgroundColor: '#f8fafc', 
                borderBottom: '1px solid var(--color-border)', 
                display: 'flex', 
                flexWrap: 'wrap', 
                gap: '0.25rem' 
            }}>
                <ToolbarButton icon={<Bold size={16} />} onClick={() => execCommand('bold')} title="Bold" />
                <ToolbarButton icon={<Italic size={16} />} onClick={() => execCommand('italic')} title="Italic" />
                <ToolbarButton icon={<Underline size={16} />} onClick={() => execCommand('underline')} title="Underline" />
                <div style={{ width: '1px', height: '20px', backgroundColor: 'var(--color-border)', margin: '4px 4px' }} />
                <ToolbarButton icon={<List size={16} />} onClick={() => execCommand('insertUnorderedList')} title="Bullet List" />
                <ToolbarButton icon={<ListOrdered size={16} />} onClick={() => execCommand('insertOrderedList')} title="Numbered List" />
                <div style={{ width: '1px', height: '20px', backgroundColor: 'var(--color-border)', margin: '4px 4px' }} />
                <ToolbarButton icon={<AlignLeft size={16} />} onClick={() => execCommand('justifyLeft')} title="Align Left" />
                <ToolbarButton icon={<AlignCenter size={16} />} onClick={() => execCommand('justifyCenter')} title="Align Center" />
                <ToolbarButton icon={<AlignRight size={16} />} onClick={() => execCommand('justifyRight')} title="Align Right" />
                <div style={{ width: '1px', height: '20px', backgroundColor: 'var(--color-border)', margin: '4px 4px' }} />
                <select 
                    onChange={(e) => execCommand('formatBlock', e.target.value)}
                    style={{ padding: '2px 4px', fontSize: '12px', borderRadius: '4px', border: '1px solid var(--color-border)' }}
                >
                    <option value="P">Paragraph</option>
                    <option value="H1">Heading 1</option>
                    <option value="H2">Heading 2</option>
                    <option value="H3">Heading 3</option>
                </select>
                <select 
                    onChange={(e) => execCommand('fontSize', e.target.value)}
                    style={{ padding: '2px 4px', fontSize: '12px', borderRadius: '4px', border: '1px solid var(--color-border)' }}
                >
                    {[1, 2, 3, 4, 5, 6, 7].map(s => <option key={s} value={s}>Size {s}</option>)}
                </select>
            </div>

            {/* Editable Area */}
            <div 
                ref={editorRef}
                contentEditable
                onInput={handleInput}
                style={{ 
                    padding: '1.5rem', 
                    height: height, 
                    overflowY: 'auto', 
                    outline: 'none',
                    fontSize: '14px',
                    lineHeight: '1.6',
                    fontFamily: 'Inter, system-ui, sans-serif'
                }}
            />
        </div>
    );
};

const ToolbarButton = ({ icon, onClick, title }) => (
    <button 
        onClick={(e) => { e.preventDefault(); onClick(); }}
        title={title}
        style={{
            padding: '6px',
            backgroundColor: 'transparent',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-text)',
            transition: 'all 0.2s'
        }}
        onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.05)'}
        onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
    >
        {icon}
    </button>
);

export default RichTextEditor;
