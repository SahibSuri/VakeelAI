document.addEventListener('DOMContentLoaded', () => {
  
  // --- Rating Widget ---
  const ratingWidget = document.getElementById('ratingWidget');
  if (ratingWidget) {
    const stars = ratingWidget.querySelectorAll('.star-btn');
    const msgEl = document.getElementById('ratingMsg');
    const judgmentId = ratingWidget.dataset.judgmentId;
    const reviewRatingInput = document.getElementById('reviewRatingInput');

    // Hover effects
    stars.forEach(star => {
      star.addEventListener('mouseover', function() {
        const value = parseInt(this.dataset.value);
        highlightStars(stars, value);
      });

      star.addEventListener('mouseout', function() {
        const activeStar = Array.from(stars).reverse().find(s => s.classList.contains('active'));
        const activeValue = activeStar ? parseInt(activeStar.dataset.value) : 0;
        highlightStars(stars, activeValue);
      });

      // Click to rate
      star.addEventListener('click', async function() {
        const value = parseInt(this.dataset.value);
        
        try {
          const res = await fetch(`/api/judgments/${judgmentId}/rate`, {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify({ value })
          });
          
          const data = await res.json();
          
          if (res.ok && data.success) {
            // Update active stars
            stars.forEach(s => s.classList.remove('active'));
            for(let i=0; i<value; i++) {
              stars[i].classList.add('active');
            }
            
            // Sync with review form if present
            if(reviewRatingInput) reviewRatingInput.value = value;

            // Show success msg
            msgEl.textContent = 'Rating saved!';
            msgEl.className = 'form-msg success';
            setTimeout(() => { msgEl.textContent = ''; }, 3000);
            
            // Optionally update avg rating in UI (reloading is easier, but dynamic is better)
            const avgEl = document.querySelector('.huge-rating .avg');
            if (avgEl && data.avgRating) {
              avgEl.textContent = data.avgRating;
            }
          } else {
            throw new Error(data.message || 'Failed to rate');
          }
        } catch (err) {
          msgEl.textContent = err.message;
          msgEl.className = 'form-msg error';
        }
      });
    });

    function highlightStars(starNodes, value) {
      starNodes.forEach(s => {
        if (parseInt(s.dataset.value) <= value) {
          s.style.color = 'var(--warning)';
          s.style.transform = 'scale(1.1)';
        } else {
          s.style.color = '';
          s.style.transform = '';
        }
      });
    }
  }

  // --- Review Form ---
  const reviewForm = document.getElementById('reviewForm');
  if (reviewForm) {
    reviewForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const msgEl = document.getElementById('reviewMsg');
      const judgmentId = reviewForm.dataset.judgmentId;
      const formData = new FormData(reviewForm);
      const payload = Object.fromEntries(formData.entries());
      payload.rating = parseInt(payload.rating); // ensure it's a number

      const btn = reviewForm.querySelector('button[type="submit"]');
      btn.disabled = true;
      btn.textContent = 'Posting...';

      try {
        const res = await fetch(`/api/judgments/${judgmentId}/reviews`, {
          method: 'POST',
          credentials: 'same-origin',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        const data = await res.json();

        if (res.ok && data.success) {
          msgEl.textContent = 'Opinion posted successfully! Refreshing...';
          msgEl.className = 'form-msg success';
          reviewForm.reset();
          
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        } else {
          // Handle validation errors from express-validator
          if (data.errors && data.errors.length > 0) {
            throw new Error(data.errors[0].msg);
          }
          throw new Error(data.message || 'Failed to post opinion');
        }
      } catch (err) {
        msgEl.textContent = err.message;
        msgEl.className = 'form-msg error';
      } finally {
        btn.disabled = false;
        btn.textContent = 'Post Opinion';
      }
    });
  }

});
