const editorConfig = {
  toolbar: {
    items: [
      'undo', 'redo',
      '|',
      'heading',
      '|',
      'fontFamily',
      'fontSize',
      '|',
      'bold',
      'italic',
      'underline',
      'strikethrough',
      'highlight',
      '|',
      'alignment',
      '|',
      'numberedList',
      'bulletedList',
      '|',
      'indent',
      'outdent',
      '|',
      'link',
      'blockQuote',
      'insertTable',
      'mediaEmbed',
      '|',
      'fontColor',
      'fontBackgroundColor',
      '|',
      'specialCharacters',
    ],
    shouldNotGroupWhenFull: true
  },
  language: 'en',
  image: {
    toolbar: [
      'imageTextAlternative',
      'imageStyle:inline',
      'imageStyle:block',
      'imageStyle:side'
    ]
  },
  table: {
    contentToolbar: [
      'tableColumn',
      'tableRow',
      'mergeTableCells'
    ]
  }
};

export default editorConfig;
