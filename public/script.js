document.getElementById('uploadForm').addEventListener('submit', async function(event) {
  event.preventDefault();

  const fileField = document.querySelector('input[type="file"]');
  const formData = new FormData();
  const file = fileField.files[0];

  // SweetAlert jika tidak ada file yang diunggah
  if (!file) {
      Swal.fire({
          icon: 'warning',
          title: 'No file selected',
          text: 'Please select a PDF file to upload!'
      });
      return;
  }

  // Validasi format file
  if (file.type !== 'application/pdf') {
      Swal.fire({
          icon: 'error',
          title: 'Invalid file format',
          text: 'Only PDF files are allowed!'
      });
      return;
  }

  // Validasi ukuran file
  if (file.size > 1 * 1024 * 1024) {
      Swal.fire({
          icon: 'error',
          title: 'File too large',
          text: 'File size should not exceed 1MB!'
      });
      return;
  }

  formData.append('cv', file);

  // Referensi ke button dan spinner
  const submitButton = document.getElementById('submitButton');
  const loadingSpinner = document.getElementById('loadingSpinner');
  const buttonText = document.getElementById('buttonText');

  // Tampilkan spinner dan ubah teks button
  buttonText.textContent = "Cooking your CV";
  loadingSpinner.classList.remove('d-none');

  try {
      const response = await fetch('/upload', {
          method: 'POST',
          body: formData,
      });

      if (!response.ok) {
          const errorData = await response.json();
          Swal.fire({
              icon: 'error',
              title: 'Upload Failed',
              text: errorData.error || 'An error occurred while processing your CV.'
          });
          throw new Error('Failed to upload and process the CV.');
      }

      const data = await response.json();
      document.getElementById('result').classList.remove('d-none');
      document.getElementById('result').textContent = data.roastedText;

      // Update jumlah CV yang telah di-roast
      updateRoastedCount();
  } catch (error) {
      console.error(error);
      Swal.fire({
          icon: 'error',
          title: 'Upload Error',
          text: 'An error occurred. Please try again.'
      });
  } finally {
      // Sembunyikan spinner dan kembalikan teks button
      loadingSpinner.classList.add('d-none');
      buttonText.textContent = "Give It a Roast!!!";
  }
});

function updateFileName() {
  const input = document.getElementById('cv');
  const fileUploadText = document.querySelector('.file-upload-text');
  const fileName = input.files.length > 0 ? input.files[0].name : 'Drag or choose a file';
  fileUploadText.textContent = fileName;
}

async function updateRoastedCount() {
  try {
      const response = await fetch('/count-roasted-cvs');
      if (!response.ok) {
          throw new Error('Failed to fetch roasted count.');
      }
      const data = await response.json();
      document.getElementById('cvCount').textContent = data.count;
  } catch (error) {
      console.error(error);
  }
}

// Panggil fungsi ketika halaman dimuat
window.onload = updateRoastedCount;
