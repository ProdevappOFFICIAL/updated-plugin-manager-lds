import React, { useRef } from 'react'
import ReactQuill from 'react-quill'
import 'react-quill/dist/quill.snow.css'
import './RichTextEditor.css' // We'll create this file for custom styling

const RichTextEditor = ({ value, onChange, placeholder }) => {
  const quillRef = useRef(null)

  // Define Quill modules/formats
  const modules = {
    toolbar: [
      [{ header: [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ color: [] }, { background: [] }],
      [{ list: 'ordered' }, { list: 'bullet' }],
      ['link', 'image', 'formula'],
      ['clean']
    ],
    clipboard: {
      matchVisual: false
    }
  }

  const formats = [
    'header',
    'bold',
    'italic',
    'underline',
    'strike',
    'color',
    'background',
    'list',
    'bullet',
    'link',
    'image',
    'formula'
  ]

  return (
    <ReactQuill
      ref={quillRef}
      theme="snow"
      value={value}
      onChange={onChange}
      modules={modules}
      formats={formats}
      placeholder={placeholder}
      className="question-editor placeholder:text-[10px]"
    />
  )
}

export default RichTextEditor
