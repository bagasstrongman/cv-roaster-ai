document.getElementById('uploadForm').addEventListener('submit', async function(event) {
    event.preventDefault();
  
    const formData = new FormData();
    const fileField = document.querySelector('input[type="file"]');
    formData.append('cv', fileField.files[0]);
  
    try {
      const response = await fetch('/upload', {
        method: 'POST',
        body: formData,
      });
  
      if (!response.ok) {
        throw new Error('Failed to upload and process the CV.');
      }
  
      const data = await response.json();
      document.getElementById('result').classList.remove('d-none');
      document.getElementById('result').textContent = data.roastedText;
    } catch (error) {
      console.error(error);
      document.getElementById('result').classList.remove('alert-success');
      document.getElementById('result').classList.add('alert-danger');
      document.getElementById('result').classList.remove('d-none');
      document.getElementById('result').textContent = 'An error occurred. Please try again.';
    }
  });